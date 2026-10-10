<?php

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\Factory;
use App\Models\ImcRegisteredNumber;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
});

function imcAdmin(): User
{
    $admin = User::factory()->imcAdmin()->create();
    Sanctum::actingAs($admin);

    return $admin;
}

describe('public IMC number check', function () {
    it('answers whether the number is registered, without authentication', function () {
        ImcRegisteredNumber::factory()->create(['name' => 'Nile Foods', 'number' => 'IMC-2026-001']);

        $this->getJson(route('api.v1.registration.imc-numbers.check', ['number' => 'IMC-2026-001']))
            ->assertOk()
            ->assertExactJson(['data' => ['exists' => true]]);

        $this->getJson(route('api.v1.registration.imc-numbers.check', ['number' => 'IMC-2026-999']))
            ->assertOk()
            ->assertExactJson(['data' => ['exists' => false]]);
    });

    it('rejects a malformed number', function () {
        $this->getJson(route('api.v1.registration.imc-numbers.check', ['number' => '12<script>']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['number']);

        $this->getJson(route('api.v1.registration.imc-numbers.check'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['number']);
    });
});

describe('factory registration against the whitelist', function () {
    it('rejects an IMC number that is not registered and tells the visitor to contact IMC', function () {
        // Self-contained payload (never whitelisted): a visitor whose number IMC never registered.
        $payload = [
            'name' => 'مصنع النيل للأغذية',
            'legal_name' => 'شركة النيل للصناعات الغذائية ش.م.م',
            'size' => 'medium',
            'sectors' => ['food'],
            'contact_name' => 'Mona Hassan',
            'contact_job_title' => 'Digital transformation lead',
            'contact_email' => 'mona@nile-foods.example',
            'contact_phone' => '+20 100 000 0000',
            'website' => 'https://nile-foods.example',
            'password' => 'correct horse battery staple',
            'password_confirmation' => 'correct horse battery staple',
            'governorate' => 'القاهرة',
            'city' => 'العبور',
            'address' => 'المنطقة الصناعية الأولى',
            'commercial_registration_number' => '123456',
            'tax_registration_number' => '987-654-321',
            'imc_number' => 'IMC-2026-404',
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
            'commercial_registration_document' => UploadedFile::fake()->create('cr.pdf', 300, 'application/pdf'),
            'tax_registration_document' => UploadedFile::fake()->create('tax.pdf', 300, 'application/pdf'),
        ];

        $response = $this->postJson(route('api.v1.registration.factories'), $payload);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['imc_number'])
            ->assertJsonPath('errors.imc_number.0', 'هذا الرقم غير مسجل لدى الهيئة، برجاء التواصل مع الهيئة.');
        $this->assertDatabaseCount('factories', 0);
        $this->assertDatabaseCount('users', 0);
    });
});

describe('IMC administration', function () {
    it('lists the numbers with search and sorting', function () {
        imcAdmin();
        ImcRegisteredNumber::factory()->create(['name' => 'Nile Foods', 'number' => 'IMC-2026-001']);
        ImcRegisteredNumber::factory()->create(['name' => 'Delta Steel', 'number' => 'IMC-2026-002']);

        $this->getJson(route('api.v1.imc-registered-numbers.index'))
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.number', 'IMC-2026-001');

        $this->getJson(route('api.v1.imc-registered-numbers.index', ['search' => 'Delta']))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.number', 'IMC-2026-002');

        $this->getJson(route('api.v1.imc-registered-numbers.index', ['sort' => 'number', 'search' => 'IMC']))
            ->assertOk()
            ->assertJsonPath('data.0.number', 'IMC-2026-001')
            ->assertJsonPath('data.1.number', 'IMC-2026-002');
    });

    it('adds a number and audits it', function () {
        $admin = imcAdmin();

        $response = $this->postJson(route('api.v1.imc-registered-numbers.store'), [
            'name' => 'Nile Foods',
            'number' => 'IMC-2026-001',
        ])->assertCreated();

        $row = ImcRegisteredNumber::query()->sole();
        expect($row->name)->toBe('Nile Foods')
            ->and($response->json('data.number'))->toBe('IMC-2026-001');

        $entry = AuditLog::query()->where('event', AuditEvent::ImcRegisteredNumberCreated)->sole();
        expect($entry->actor_user_id)->toBe($admin->id)
            ->and($entry->subject_type)->toBe('imc_registered_number')
            ->and($entry->subject_id)->toBe($row->id)
            ->and($entry->metadata)->toEqual(['name' => 'Nile Foods', 'number' => 'IMC-2026-001']);
    });

    it('rejects a duplicate number', function () {
        imcAdmin();
        ImcRegisteredNumber::factory()->create(['number' => 'IMC-2026-001']);

        $this->postJson(route('api.v1.imc-registered-numbers.store'), ['name' => 'Other', 'number' => 'IMC-2026-001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['number']);
        $this->assertDatabaseCount('imc_registered_numbers', 1);
    });

    it('renames a number and audits the change', function () {
        $admin = imcAdmin();
        $row = ImcRegisteredNumber::factory()->create(['name' => 'Old Name', 'number' => 'IMC-2026-001']);

        $this->patchJson(route('api.v1.imc-registered-numbers.update', $row), ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name');

        expect($row->fresh()?->number)->toBe('IMC-2026-001');
        $entry = AuditLog::query()->where('event', AuditEvent::ImcRegisteredNumberUpdated)->sole();
        expect($entry->actor_user_id)->toBe($admin->id)
            ->and($entry->metadata['fields'])->toBe(['name']);
    });

    it('rejects renaming a number to one that is taken', function () {
        imcAdmin();
        ImcRegisteredNumber::factory()->create(['number' => 'IMC-2026-001']);
        $other = ImcRegisteredNumber::factory()->create(['number' => 'IMC-2026-002']);

        $this->patchJson(route('api.v1.imc-registered-numbers.update', $other), ['number' => 'IMC-2026-001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['number']);
    });

    it('deletes a number and audits it', function () {
        $admin = imcAdmin();
        $row = ImcRegisteredNumber::factory()->create(['number' => 'IMC-2026-001']);

        $this->deleteJson(route('api.v1.imc-registered-numbers.destroy', $row))->assertNoContent();
        $this->assertDatabaseCount('imc_registered_numbers', 0);

        $entry = AuditLog::query()->where('event', AuditEvent::ImcRegisteredNumberDeleted)->sole();
        expect($entry->actor_user_id)->toBe($admin->id)
            ->and($entry->metadata['number'])->toBe('IMC-2026-001');
    });

    it('forbids factory members and anonymous visitors', function () {
        ImcRegisteredNumber::factory()->create(['number' => 'IMC-2026-001']);

        Sanctum::actingAs(User::factory()->factoryMember(Factory::factory()->create())->create());
        $this->getJson(route('api.v1.imc-registered-numbers.index'))->assertForbidden();
        $this->postJson(route('api.v1.imc-registered-numbers.store'), ['name' => 'X', 'number' => 'IMC-1'])->assertForbidden();
    });
});

describe('bulk import', function () {
    it('imports a CSV of name and number, updating existing rows and reporting bad rows', function () {
        $admin = imcAdmin();
        ImcRegisteredNumber::factory()->create(['name' => 'Old Nile Name', 'number' => 'IMC-2026-001']);

        $csv = <<<'CSV'
            name,number
            Nile Foods,IMC-2026-001
            Delta Steel,IMC-2026-002
            ,IMC-2026-003
            Bad Row,12<script>
            ,
            CSV;

        $response = $this->post(route('api.v1.imc-registered-numbers.import'), [
            'file' => UploadedFile::fake()->createWithContent('numbers.csv', $csv),
        ], ['Accept' => 'application/json'])->assertOk();

        expect($response->json('data.created'))->toBe(2)
            ->and($response->json('data.updated'))->toBe(1)
            ->and($response->json('data.skipped'))->toBe(1)
            ->and($response->json('data.errors'))->toHaveCount(1)
            ->and($response->json('data.errors.0.row'))->toBe(5);

        expect(ImcRegisteredNumber::query()->where('number', 'IMC-2026-001')->sole()->name)->toBe('Nile Foods')
            ->and(ImcRegisteredNumber::query()->where('number', 'IMC-2026-003')->sole()->name)->toBe('IMC-2026-003');

        $entry = AuditLog::query()->where('event', AuditEvent::ImcRegisteredNumberImported)->sole();
        expect($entry->actor_user_id)->toBe($admin->id)
            ->and($entry->metadata)->toEqual(['created' => 2, 'updated' => 1, 'skipped' => 1, 'failed' => 1]);
    });

    it('imports an Excel workbook with shared and inline strings', function () {
        imcAdmin();

        $strings = ['name', 'number', 'Nile Foods', 'IMC-2026-001', 'Bad', '12<script>'];
        $sst = '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="6" uniqueCount="6">';
        foreach ($strings as $text) {
            $sst .= '<si><t>'.htmlspecialchars($text, ENT_XML1).'</t></si>';
        }
        $sst .= '</sst>';

        $sheet = <<<'XML'
            <?xml version="1.0" encoding="UTF-8"?>
            <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
            <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
            <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>
            <row r="3"><c r="A3" t="inlineStr"><is><t>Inline Factory</t></is></c><c r="B3"><v>IMC-2026-007</v></c></row>
            <row r="4"><c r="A4" t="s"><v>4</v></c><c r="B4" t="s"><v>5</v></c></row>
            </sheetData></worksheet>
            XML;

        $path = tempnam(sys_get_temp_dir(), 'imc-import').'.xlsx';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheet);
        $zip->addFromString('xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8"?>'.$sst);
        $zip->close();

        $response = $this->post(route('api.v1.imc-registered-numbers.import'), [
            'file' => new UploadedFile($path, 'numbers.xlsx', null, null, true),
        ], ['Accept' => 'application/json'])->assertOk();

        expect($response->json('data.created'))->toBe(2)
            ->and($response->json('data.errors'))->toHaveCount(1)
            ->and($response->json('data.errors.0.row'))->toBe(4);

        expect(ImcRegisteredNumber::query()->where('number', 'IMC-2026-001')->sole()->name)->toBe('Nile Foods')
            ->and(ImcRegisteredNumber::query()->where('number', 'IMC-2026-007')->sole()->name)->toBe('Inline Factory');
    });

    it('rejects a non-spreadsheet file', function () {
        imcAdmin();

        $this->post(route('api.v1.imc-registered-numbers.import'), [
            'file' => UploadedFile::fake()->create('numbers.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
        $this->assertDatabaseCount('imc_registered_numbers', 0);
    });

    it('forbids factory members from importing', function () {
        Sanctum::actingAs(User::factory()->factoryMember(Factory::factory()->create())->create());

        $this->post(route('api.v1.imc-registered-numbers.import'), [
            'file' => UploadedFile::fake()->createWithContent('numbers.csv', "name,number\nNile,IMC-2026-001\n"),
        ], ['Accept' => 'application/json'])->assertForbidden();
    });
});

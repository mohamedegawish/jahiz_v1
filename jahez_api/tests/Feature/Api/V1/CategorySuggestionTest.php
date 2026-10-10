<?php

use App\Enums\CategorySuggestionStatus;
use App\Enums\FactoryApprovalStatus;
use App\Models\CategorySuggestion;
use App\Models\Factory;
use App\Models\ServiceCategory;
use App\Models\ServiceProvider;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
});

function suggestionProvider(): array
{
    $provider = ServiceProvider::factory()->approved()->inSectors('food')->offering('erp_business_applications.01')->create();
    $member = User::factory()->providerMember($provider)->create();

    return [$provider, $member];
}

function suggestionAdmin(): User
{
    return User::factory()->imcAdmin()->create();
}

it('lets a provider suggest a missing category, visible only to its own provider and IMC', function () {
    [$provider, $member] = suggestionProvider();
    Sanctum::actingAs($member);

    $this->postJson(route('api.v1.category-suggestions.store'), [
        'name_ar' => 'تصنيف التدريب الصناعي',
        'description' => 'كورسات وتأهيل للعاملين',
        'reason' => 'لا يوجد تصنيف تدريبي مستقل',
    ])->assertCreated()
        ->assertJsonPath('data.name_ar', 'تصنيف التدريب الصناعي')
        ->assertJsonPath('data.status', 'pending');

    $suggestion = CategorySuggestion::query()->sole();
    expect($suggestion->service_provider_id)->toBe($provider->id)
        ->and($suggestion->status)->toBe(CategorySuggestionStatus::Pending);

    // Another provider cannot see it (404, not 403, so competitors learn nothing).
    $other = ServiceProvider::factory()->approved()->inSectors('food')->create();
    Sanctum::actingAs(User::factory()->providerMember($other)->create());
    $this->getJson(route('api.v1.category-suggestions.index'))->assertOk()->assertJsonCount(0, 'data');

    // IMC sees it.
    Sanctum::actingAs(suggestionAdmin());
    $this->getJson(route('api.v1.category-suggestions.index'))->assertOk()->assertJsonCount(1, 'data');
});

it('refuses a suggestion naming a category the catalog already has', function () {
    [$provider, $member] = suggestionProvider();
    Sanctum::actingAs($member);

    $existing = ServiceCategory::query()->firstOrFail()->name_ar;

    $this->postJson(route('api.v1.category-suggestions.store'), ['name_ar' => $existing])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name_ar']);
    expect(CategorySuggestion::query()->count())->toBe(0);
});

it('lets IMC approve a suggestion as a workbook candidate and reject with a reason', function () {
    [$provider, $member] = suggestionProvider();
    Sanctum::actingAs($member);
    $this->postJson(route('api.v1.category-suggestions.store'), ['name_ar' => 'تصنيف جديد'])->assertCreated();
    $suggestion = CategorySuggestion::query()->sole();

    // Provider cannot approve its own suggestion.
    $this->postJson(route('api.v1.category-suggestions.approve', $suggestion))->assertForbidden();

    Sanctum::actingAs(suggestionAdmin());
    $this->postJson(route('api.v1.category-suggestions.approve', $suggestion), ['reason' => 'يضاف في تحديث الكتالوج القادم'])
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    // Approving twice is a conflict, and the catalog itself is untouched (ADR-014).
    $this->postJson(route('api.v1.category-suggestions.approve', $suggestion))->assertConflict();
    expect(ServiceCategory::query()->where('name_ar', 'تصنيف جديد')->count())->toBe(0);

    // Rejection needs a reason.
    Sanctum::actingAs($member);
    $this->postJson(route('api.v1.category-suggestions.store'), ['name_ar' => 'تصنيف مرفوض'])->assertCreated();
    $second = CategorySuggestion::query()->where('name_ar', 'تصنيف مرفوض')->sole();
    Sanctum::actingAs(suggestionAdmin());
    $this->postJson(route('api.v1.category-suggestions.reject', $second))->assertUnprocessable();
    $this->postJson(route('api.v1.category-suggestions.reject', $second), ['reason' => 'مكرر مع تصنيف موجود'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.review_reason', 'مكرر مع تصنيف موجود');
});

it('blocks a pending factory from collecting offers in the cart (409), like sending requests', function () {
    $factory = Factory::factory()->inSectors('food')->withApprovalStatus(FactoryApprovalStatus::Pending)->create();
    everyServiceAvailable($factory);
    $member = User::factory()->factoryMember($factory)->create();
    $provider = ServiceProvider::factory()->approved()->inSectors('food')->offering('erp_business_applications.01')->create();
    Sanctum::actingAs($member);

    $this->postJson(route('api.v1.cart.items.store'), [
        'service' => 'erp_business_applications.01',
        'provider_id' => $provider->id,
    ])->assertConflict();

    // After IMC approval the same call succeeds.
    $factory->forceFill(['approval_status' => FactoryApprovalStatus::Approved, 'approval_changed_at' => now()])->save();
    $this->postJson(route('api.v1.cart.items.store'), [
        'service' => 'erp_business_applications.01',
        'provider_id' => $provider->id,
    ])->assertCreated();
});

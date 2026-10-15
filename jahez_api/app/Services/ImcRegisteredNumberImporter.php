<?php

namespace App\Services;

use App\Models\ImcRegisteredNumber;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use XMLReader;
use ZipArchive;

/**
 * Bulk import of IMC-registered factory numbers from an Excel (.xlsx) or CSV file
 * with name + number columns. No spreadsheet package is used: CSV is read with
 * fgetcsv and .xlsx (a zip of XML files) with ZipArchive + XMLReader, so the import
 * works on the stock platform extensions only.
 *
 * Every data row is validated again here, so one bad row never rejects the file:
 * rows are upserted by the number only (an existing number keeps its place and gets
 * the new name), and the per-row problems are returned for the administrator.
 */
class ImcRegisteredNumberImporter
{
    /**
     * Header words (English and Arabic) recognized as the name / number columns. A
     * first row holding one of these is skipped as a header.
     */
    private const NAME_HEADERS = ['name', 'factory', 'factory name', 'اسم', 'الاسم', 'اسم المصنع', 'المصنع', 'المنشأة'];

    private const NUMBER_HEADERS = ['number', 'num', 'no', 'imc', 'imc number', 'imc_number', 'imc no', 'رقم', 'الرقم', 'رقم imc', 'الرقم المسجل', 'رقم القيد'];

    /**
     * The largest worksheet or shared-strings part read from a workbook, expanded. The
     * upload is at most 5 MB, but a zip can expand far beyond it (a zip bomb), and each
     * part is read into memory; the declared size is checked first (finding PA-28).
     * Twenty megabytes hold hundreds of thousands of rows.
     */
    public const MAX_XML_BYTES = 20 * 1024 * 1024;

    /**
     * @return array{created: int, updated: int, skipped: int, errors: list<array{row: int, number: string|null, reason: string}>}
     */
    public function import(UploadedFile $file, User $actor): array
    {
        $rows = $this->readRows($file);

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        DB::transaction(function () use ($rows, $actor, &$created, &$updated, &$skipped, &$errors): void {
            foreach ($rows as $row) {
                $number = trim($row['number']);

                if ($number === '' && trim($row['name']) === '') {
                    $skipped++;

                    continue;
                }

                if ($number === '') {
                    $errors[] = ['row' => $row['row'], 'number' => null, 'reason' => 'The number is missing.'];

                    continue;
                }

                if (! preg_match('/^[0-9A-Za-z\x{0660}-\x{0669} \/-]{1,50}$/u', $number)) {
                    $errors[] = ['row' => $row['row'], 'number' => $number, 'reason' => 'The number may contain only digits, letters, spaces, / and -, up to 50 characters.'];

                    continue;
                }

                $name = trim($row['name']) === '' ? $number : mb_substr(trim($row['name']), 0, 255);

                $existing = ImcRegisteredNumber::query()->where('number', $number)->lockForUpdate()->first();

                if ($existing === null) {
                    $entry = new ImcRegisteredNumber(['name' => $name, 'number' => $number]);
                    $entry->created_by_user_id = $actor->id;
                    $entry->updated_by_user_id = $actor->id;
                    $entry->save();
                    $created++;
                } elseif ($existing->name !== $name) {
                    $existing->name = $name;
                    $existing->updated_by_user_id = $actor->id;
                    $existing->save();
                    $updated++;
                }
            }

            $errors = array_slice($errors, 0, 50);
        });

        return ['created' => $created, 'updated' => $updated, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Read the file as name + number rows (first column: name, second column: number).
     *
     * @return list<array{row: int, name: string, number: string}>
     */
    private function readRows(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        $rows = $extension === 'xlsx' ? $this->readXlsx($file) : $this->readCsv($file);

        if ($rows !== [] && $this->isHeaderRow($rows[0]['name'], $rows[0]['number'])) {
            $rows = array_slice($rows, 1);
        }

        return $rows;
    }

    private function isHeaderRow(string $name, string $number): bool
    {
        $name = mb_strtolower(trim($name));
        $number = mb_strtolower(trim($number));

        return in_array($name, self::NAME_HEADERS, true) || in_array($number, self::NUMBER_HEADERS, true);
    }

    /**
     * @return list<array{row: int, name: string, number: string}>
     */
    private function readCsv(UploadedFile $file): array
    {
        $contents = file_get_contents($file->getRealPath());
        if ($contents === false) {
            throw new RuntimeException('The uploaded file could not be read.');
        }

        $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents) ?? '';

        $firstLine = strtok($contents, "\r\n") ?: '';
        $delimiter = ',';
        $best = 0;
        foreach ([',', ';', "\t"] as $candidate) {
            $count = count(str_getcsv($firstLine, $candidate));
            if ($count > $best) {
                $best = $count;
                $delimiter = $candidate;
            }
        }

        $stream = fopen('php://temp', 'r+');
        if ($stream === false) {
            throw new RuntimeException('The uploaded file could not be read.');
        }

        fwrite($stream, $contents);
        rewind($stream);

        $rows = [];
        $line = 0;
        while (($cells = fgetcsv($stream, 0, $delimiter)) !== false) {
            $line++;
            $rows[] = ['row' => $line, 'name' => (string) ($cells[0] ?? ''), 'number' => (string) ($cells[1] ?? '')];
        }

        fclose($stream);

        return $rows;
    }

    /**
     * Read the first worksheet of an .xlsx file: the shared strings first, then the
     * sheet rows in order (first cell: name, second cell: number).
     *
     * @return list<array{row: int, name: string, number: string}>
     */
    private function readXlsx(UploadedFile $file): array
    {
        $zip = new ZipArchive;
        if ($zip->open($file->getRealPath()) !== true) {
            throw self::unreadable('The Excel file could not be read. Save it again as .xlsx (or as CSV) and retry.');
        }

        try {
            $shared = $this->readSharedStrings($zip);

            $sheetPath = null;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = (string) $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/worksheets/sheet')) {
                    if ($sheetPath === null || strcmp($name, $sheetPath) < 0) {
                        $sheetPath = $name;
                    }
                }
            }

            if ($sheetPath === null) {
                throw self::unreadable('The Excel file holds no worksheet.');
            }

            return $this->readSheetRows((string) $this->readPart($zip, $sheetPath), $shared);
        } finally {
            $zip->close();
        }
    }

    /**
     * @return list<string>
     */
    private function readSharedStrings(ZipArchive $zip): array
    {
        $xml = $this->readPart($zip, 'xl/sharedStrings.xml');
        if ($xml === null) {
            return [];
        }

        $reader = new XMLReader;
        $reader->XML($xml, null, LIBXML_NONET);

        $shared = [];
        $current = null;

        while ($reader->read()) {
            if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'si') {
                $current = '';
            } elseif ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 't' && $current !== null) {
                $current .= $reader->readString();
            } elseif ($reader->nodeType === XMLReader::END_ELEMENT && $reader->name === 'si' && $current !== null) {
                $shared[] = $current;
                $current = null;
            }
        }

        $reader->close();

        return $shared;
    }

    /**
     * One part of the workbook, expanded, or null when the workbook has no such part. A
     * part over MAX_XML_BYTES is refused from its declared size, and the read itself stops
     * after that many bytes in case the declared size lies (finding PA-28).
     */
    private function readPart(ZipArchive $zip, string $name): ?string
    {
        $stat = $zip->statName($name);
        if ($stat === false) {
            return null;
        }

        $tooLarge = 'The Excel file is too large to import. Split it into smaller files, or import it as CSV.';
        if ($stat['size'] > self::MAX_XML_BYTES) {
            throw self::unreadable($tooLarge);
        }

        $xml = $zip->getFromName($name, self::MAX_XML_BYTES + 1);
        if ($xml === false) {
            throw self::unreadable('The Excel file could not be read. Save it again as .xlsx (or as CSV) and retry.');
        }
        if (strlen($xml) > self::MAX_XML_BYTES) {
            throw self::unreadable($tooLarge);
        }

        return $xml;
    }

    /**
     * A workbook the importer cannot use is the administrator's file problem: a 422 on
     * the file field, not a server error (finding PA-33).
     */
    private static function unreadable(string $message): ValidationException
    {
        return ValidationException::withMessages(['file' => $message]);
    }

    /**
     * @param  list<string>  $shared
     * @return list<array{row: int, name: string, number: string}>
     */
    private function readSheetRows(string $xml, array $shared): array
    {
        $reader = new XMLReader;
        $reader->XML($xml, null, LIBXML_NONET);

        $rows = [];
        $line = 0;
        $cells = null;
        $cellType = null;
        $cellValue = null;

        while ($reader->read()) {
            if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'row') {
                $cells = [];
            } elseif ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'c' && $cells !== null) {
                $cellType = $reader->getAttribute('t');
                $cellValue = null;
            } elseif ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'v' && $cells !== null) {
                $raw = $reader->readString();
                $cellValue = $cellType === 's' ? ($shared[(int) $raw] ?? '') : $raw;
            } elseif ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 't' && $cells !== null && $cellType === 'inlineStr') {
                $cellValue = ($cellValue ?? '').$reader->readString();
            } elseif ($reader->nodeType === XMLReader::END_ELEMENT && $reader->name === 'c' && $cells !== null) {
                $cells[] = (string) ($cellValue ?? '');
                $cellType = null;
                $cellValue = null;
            } elseif ($reader->nodeType === XMLReader::END_ELEMENT && $reader->name === 'row' && $cells !== null) {
                $line++;
                $rows[] = ['row' => $line, 'name' => (string) ($cells[0] ?? ''), 'number' => (string) ($cells[1] ?? '')];
                $cells = null;
            }
        }

        $reader->close();

        return $rows;
    }
}

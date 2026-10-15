<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ImportImcRegisteredNumbersRequest;
use App\Http\Requests\Api\V1\ListImcRegisteredNumbersRequest;
use App\Http\Requests\Api\V1\StoreImcRegisteredNumberRequest;
use App\Http\Requests\Api\V1\UpdateImcRegisteredNumberRequest;
use App\Http\Resources\V1\ImcRegisteredNumberResource;
use App\Models\AuditLog;
use App\Models\ImcRegisteredNumber;
use App\Models\User;
use App\Services\ImcRegisteredNumberImporter;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * The IMC-registered factory numbers (the "الرقم المسجل لدى IMC" whitelist). IMC
 * administrators list, add, rename and delete rows, or bulk-import them from an
 * Excel/CSV file of name + number. A factory self-registration is accepted only when
 * its IMC number is on this list, matched by the number only. Every change is audited
 * in its transaction.
 */
class ImcRegisteredNumberController extends Controller
{
    public function index(ListImcRegisteredNumbersRequest $request): AnonymousResourceCollection
    {
        $rows = ImcRegisteredNumber::query()
            ->when($request->input('search'), fn (Builder $query, string $term) => $query->numberOrNameContains($term))
            ->when($request->sortColumnAndDirection(), fn (Builder $query, array $sort) => $query->orderBy($sort[0], $sort[1]))
            ->orderBy('id')
            ->paginate($request->perPage())
            ->withQueryString();

        return ImcRegisteredNumberResource::collection($rows);
    }

    public function store(StoreImcRegisteredNumberRequest $request, #[CurrentUser] User $actor): JsonResponse
    {
        $row = DB::transaction(function () use ($request, $actor): ImcRegisteredNumber {
            $row = new ImcRegisteredNumber($request->safe()->only(['name', 'number']));
            $row->created_by_user_id = $actor->id;
            $row->updated_by_user_id = $actor->id;
            $row->save();

            AuditLog::record(AuditEvent::ImcRegisteredNumberCreated, $actor, $row, [
                'name' => $row->name,
                'number' => $row->number,
            ]);

            return $row;
        });

        return (new ImcRegisteredNumberResource($row))
            ->response()
            ->setStatusCode(JsonResponse::HTTP_CREATED);
    }

    public function update(UpdateImcRegisteredNumberRequest $request, ImcRegisteredNumber $imcRegisteredNumber, #[CurrentUser] User $actor): ImcRegisteredNumberResource
    {
        DB::transaction(function () use ($request, $imcRegisteredNumber, $actor): void {
            $imcRegisteredNumber->fill($request->safe()->only(['name', 'number']));
            $changes = array_keys($imcRegisteredNumber->getDirty());
            sort($changes);

            if ($changes !== []) {
                $imcRegisteredNumber->updated_by_user_id = $actor->id;
                $imcRegisteredNumber->save();

                AuditLog::record(AuditEvent::ImcRegisteredNumberUpdated, $actor, $imcRegisteredNumber, [
                    'fields' => $changes,
                    'name' => $imcRegisteredNumber->name,
                    'number' => $imcRegisteredNumber->number,
                ]);
            }
        });

        return new ImcRegisteredNumberResource($imcRegisteredNumber);
    }

    public function destroy(ImcRegisteredNumber $imcRegisteredNumber, #[CurrentUser] User $actor): Response
    {
        Gate::authorize('manage', $imcRegisteredNumber);

        DB::transaction(function () use ($imcRegisteredNumber, $actor): void {
            $imcRegisteredNumber->delete();

            AuditLog::record(AuditEvent::ImcRegisteredNumberDeleted, $actor, null, [
                'name' => $imcRegisteredNumber->name,
                'number' => $imcRegisteredNumber->number,
            ]);
        });

        return response()->noContent();
    }

    /**
     * Bulk import from an Excel (.xlsx) or CSV file of name + number. Rows are
     * upserted by the number only; one bad row never rejects the file. The rows and the
     * audit entry are committed together (ADR-012, finding PA-32).
     */
    public function import(ImportImcRegisteredNumbersRequest $request, ImcRegisteredNumberImporter $importer, #[CurrentUser] User $actor): JsonResponse
    {
        $summary = DB::transaction(function () use ($request, $importer, $actor): array {
            $summary = $importer->import($request->file('file'), $actor);

            AuditLog::record(AuditEvent::ImcRegisteredNumberImported, $actor, null, [
                'created' => $summary['created'],
                'updated' => $summary['updated'],
                'skipped' => $summary['skipped'],
                'failed' => count($summary['errors']),
            ]);

            return $summary;
        });

        return response()->json(['data' => $summary]);
    }
}

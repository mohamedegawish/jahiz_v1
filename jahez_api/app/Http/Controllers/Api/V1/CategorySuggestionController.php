<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Enums\CategorySuggestionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListCategorySuggestionsRequest;
use App\Http\Requests\Api\V1\ReviewCategorySuggestionRequest;
use App\Http\Requests\Api\V1\StoreCategorySuggestionRequest;
use App\Http\Resources\V1\CategorySuggestionResource;
use App\Models\AuditLog;
use App\Models\CategorySuggestion;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Provider-suggested service categories (not in the workbook catalog).
 * A provider proposes; IMC approves (workbook candidate) or rejects with a reason.
 * Approval never writes a catalog row (ADR-014): the workbook update does that.
 */
class CategorySuggestionController extends Controller
{
    public function index(ListCategorySuggestionsRequest $request, #[CurrentUser] User $user): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', CategorySuggestion::class);

        $suggestions = CategorySuggestion::query()
            ->when($user->service_provider_id !== null, fn (Builder $query) => $query->where('service_provider_id', $user->service_provider_id))
            ->when($request->input('filter.status'), fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($request->input('filter.provider'), fn (Builder $query, string $id) => $query->where('service_provider_id', (int) $id))
            ->with('serviceProvider')
            ->orderBy('id', 'desc')
            ->paginate($request->perPage())
            ->withQueryString();

        return CategorySuggestionResource::collection($suggestions);
    }

    public function store(StoreCategorySuggestionRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        Gate::authorize('create', CategorySuggestion::class);

        $nameAr = $request->string('name_ar')->toString();

        // A suggestion must name something actually missing: refuse names the catalog
        // already has (exact match) and duplicate pending suggestions from the same provider.
        $exists = ServiceCategory::query()->where('name_ar', $nameAr)->exists()
            || CategorySuggestion::query()
                ->where('service_provider_id', (int) $user->service_provider_id)
                ->where('status', CategorySuggestionStatus::Pending)
                ->where('name_ar', $nameAr)
                ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'name_ar' => 'This category already exists in the catalog or in your pending suggestions.',
            ]);
        }

        $suggestion = DB::transaction(function () use ($request, $user): CategorySuggestion {
            $suggestion = new CategorySuggestion;
            $suggestion->service_provider_id = (int) $user->service_provider_id;
            $suggestion->created_by_user_id = $user->id;
            $suggestion->name_ar = $request->string('name_ar')->toString();
            $suggestion->name_en = $request->filled('name_en') ? $request->string('name_en')->toString() : null;
            $suggestion->description = $request->filled('description') ? $request->string('description')->toString() : null;
            $suggestion->reason = $request->filled('reason') ? $request->string('reason')->toString() : null;
            $suggestion->status = CategorySuggestionStatus::Pending;
            $suggestion->save();

            AuditLog::record(AuditEvent::CategorySuggestionCreated, $user, $suggestion, [
                'name_ar' => $suggestion->name_ar,
                'service_provider_id' => $suggestion->service_provider_id,
            ]);

            return $suggestion;
        });

        return (new CategorySuggestionResource($suggestion->load('serviceProvider')))
            ->response()
            ->setStatusCode(JsonResponse::HTTP_CREATED);
    }

    public function approve(ReviewCategorySuggestionRequest $request, CategorySuggestion $categorySuggestion, #[CurrentUser] User $user): CategorySuggestionResource
    {
        Gate::authorize('review', CategorySuggestion::class);

        if (! $categorySuggestion->isPending()) {
            throw new ConflictHttpException("This suggestion is {$categorySuggestion->status->value} and cannot be approved.");
        }

        DB::transaction(function () use ($request, $categorySuggestion, $user): void {
            $locked = CategorySuggestion::query()->lockForUpdate()->findOrFail($categorySuggestion->id);

            if (! $locked->isPending()) {
                throw new ConflictHttpException("This suggestion is {$locked->status->value} and cannot be approved.");
            }

            $locked->status = CategorySuggestionStatus::Approved;
            $locked->review_reason = $request->filled('reason') ? $request->string('reason')->toString() : null;
            $locked->reviewed_by_user_id = $user->id;
            $locked->reviewed_at = now();
            $locked->save();

            AuditLog::record(AuditEvent::CategorySuggestionReviewed, $user, $locked, [
                'decision' => 'approved',
                'name_ar' => $locked->name_ar,
            ]);
        });

        return new CategorySuggestionResource($categorySuggestion->refresh()->load('serviceProvider'));
    }

    public function reject(ReviewCategorySuggestionRequest $request, CategorySuggestion $categorySuggestion, #[CurrentUser] User $user): CategorySuggestionResource
    {
        Gate::authorize('review', CategorySuggestion::class);

        $request->validate(['reason' => ['required', 'string', 'max:2000']]);

        if (! $categorySuggestion->isPending()) {
            throw new ConflictHttpException("This suggestion is {$categorySuggestion->status->value} and cannot be rejected.");
        }

        DB::transaction(function () use ($request, $categorySuggestion, $user): void {
            $locked = CategorySuggestion::query()->lockForUpdate()->findOrFail($categorySuggestion->id);

            if (! $locked->isPending()) {
                throw new ConflictHttpException("This suggestion is {$locked->status->value} and cannot be rejected.");
            }

            $locked->status = CategorySuggestionStatus::Rejected;
            $locked->review_reason = $request->string('reason')->toString();
            $locked->reviewed_by_user_id = $user->id;
            $locked->reviewed_at = now();
            $locked->save();

            AuditLog::record(AuditEvent::CategorySuggestionReviewed, $user, $locked, [
                'decision' => 'rejected',
                'name_ar' => $locked->name_ar,
            ]);
        });

        return new CategorySuggestionResource($categorySuggestion->refresh()->load('serviceProvider'));
    }
}

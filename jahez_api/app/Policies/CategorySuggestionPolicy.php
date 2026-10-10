<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\CategorySuggestion;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Providers manage only their own suggestions; IMC reviews them with the same
 * permission as service listings (no new permission matrix needed).
 */
class CategorySuggestionPolicy
{
    public function viewAny(User $user): Response
    {
        return $user->service_provider_id !== null || $user->hasPermission(Permission::ServiceListingsReview)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function view(User $user, CategorySuggestion $suggestion): Response
    {
        if ($user->hasPermission(Permission::ServiceListingsReview)) {
            return Response::allow();
        }

        return $user->service_provider_id !== null && $user->service_provider_id === $suggestion->service_provider_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function create(User $user): Response
    {
        return $user->service_provider_id !== null
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function review(User $user): Response
    {
        return $user->hasPermission(Permission::ServiceListingsReview)
            ? Response::allow()
            : Response::deny();
    }
}

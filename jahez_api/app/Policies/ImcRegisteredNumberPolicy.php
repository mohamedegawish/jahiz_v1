<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * The IMC-registered factory numbers (the "الرقم المسجل لدى IMC" whitelist). Only IMC
 * administrators manage them; factory and provider members never see this
 * administration. The public registration check answers only whether a number is on
 * the list, without authentication.
 */
class ImcRegisteredNumberPolicy
{
    public function viewAny(User $user): Response
    {
        return $user->hasPermission(Permission::ImcRegisteredNumbersManage) ? Response::allow() : Response::deny();
    }

    public function manage(User $user): Response
    {
        return $user->hasPermission(Permission::ImcRegisteredNumbersManage) ? Response::allow() : Response::deny();
    }
}

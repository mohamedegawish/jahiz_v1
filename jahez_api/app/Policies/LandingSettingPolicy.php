<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\LandingSetting;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * The landing-page content is managed by IMC administrators with
 * announcements.manage, like the landing-page announcements (ADR-022).
 * Everyone reads it through the public endpoint.
 */
class LandingSettingPolicy
{
    public function update(User $user, LandingSetting $settings): Response
    {
        return $user->hasPermission(Permission::AnnouncementsManage) ? Response::allow() : Response::denyAsNotFound();
    }
}

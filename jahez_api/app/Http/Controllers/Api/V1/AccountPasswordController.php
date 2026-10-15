<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\UpdatePasswordRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * The signed-in account changes its own password (ADR-011 addendum, finding PA-12). Every
 * other token of the account is revoked, so a device that knew the old password is signed
 * out; the token of this request stays valid. A changed password does not verify the email
 * address (only a reset link sent to it does).
 *
 * The new password, the revoked tokens and the audit entry are committed together.
 */
class AccountPasswordController extends Controller
{
    public const RESPONSE_MESSAGE = 'Your password has been changed. Every other device was signed out.';

    public function __invoke(UpdatePasswordRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $current = $user->currentAccessToken();

        DB::transaction(function () use ($request, $user, $current): void {
            $user->password = $request->string('password')->toString();
            $user->save();

            $revoked = $user->tokens()->whereKeyNot($current->getKey())->delete();

            AuditLog::record(AuditEvent::PasswordChanged, $user, $user, ['other_credentials_revoked' => $revoked]);
        });

        return response()->json(['data' => ['message' => self::RESPONSE_MESSAGE]]);
    }
}

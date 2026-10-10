<?php

namespace App\Services;

use App\Enums\AuditEvent;
use App\Enums\DocumentType;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\CatalogService;
use App\Models\Factory;
use App\Models\OrganizationDocument;
use App\Models\Sector;
use App\Models\ServiceProvider;
use App\Models\User;
use App\Notifications\MarketplaceNotifications;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creates the organization of a public self-registration synchronously, inside the
 * request (ADR-019): the organization, its first member (with the password chosen on
 * the form, verified immediately), its documents and the audit entry, in one
 * transaction. No email is ever sent from this path: the member signs in at once.
 *
 * The 202 response stays identical whether or not the email already has an account
 * (ADR-011): a duplicate email creates nothing and sends nothing.
 */
class OrganizationRegistrar
{
    public const FACTORY = 'factory';

    public const SERVICE_PROVIDER = 'service_provider';

    /**
     * @param  self::FACTORY|self::SERVICE_PROVIDER  $kind
     * @param  array<string, mixed>  $details  validated organization fields
     * @param  array{sectors: list<string>, services: list<string>}  $codes
     * @param  array{name: string, email: string, password_hash: string}  $account  bcrypt hash, never a plain password
     * @param  list<array{type: string, disk: string, path: string, original_name: string, mime_type: string, size_bytes: int, sha256: string}>  $documents  staged uploads
     *
     * @throws UniqueConstraintViolationException when a concurrent registration took the email first
     */
    public function register(
        string $kind,
        array $details,
        array $codes,
        array $account,
        array $documents,
        string $registrationId,
        ?string $ipAddress,
    ): User {
        return DB::transaction(fn (): User => $kind === self::FACTORY
            ? $this->registerFactory($details, $codes, $account, $documents, $registrationId, $ipAddress)
            : $this->registerServiceProvider($details, $codes, $account, $documents, $registrationId, $ipAddress));
    }

    /**
     * Whether the email already identifies an account: the stored address apart from
     * letter case only, as at login (the database collation alone would also ignore
     * accents).
     */
    public function emailTaken(string $email): bool
    {
        $user = User::query()->where('email', $email)->first();

        return $user !== null && Str::lower($user->email) === Str::lower($email);
    }

    /**
     * @param  array<string, mixed>  $details
     * @param  array{sectors: list<string>, services: list<string>}  $codes
     * @param  array{name: string, email: string, password_hash: string}  $account
     * @param  list<array{type: string, disk: string, path: string, original_name: string, mime_type: string, size_bytes: int, sha256: string}>  $documents
     */
    private function registerFactory(
        array $details,
        array $codes,
        array $account,
        array $documents,
        string $registrationId,
        ?string $ipAddress,
    ): User {
        $factory = new Factory;
        $factory->fill($details);
        $factory->save();
        $factory->sectors()->sync(Sector::query()->whereIn('code', $codes['sectors'])->pluck('id'));

        $member = $this->createMember(Role::FactoryMember, $factory, $account);
        $documentTypes = $this->attachDocuments($factory, $member, $documents);

        AuditLog::record(AuditEvent::FactoryRegistered, $member, $factory, [
            'registration_id' => $registrationId,
            'name' => $factory->name,
            'sectors' => $codes['sectors'],
            'documents' => $documentTypes,
        ], $ipAddress);
        MarketplaceNotifications::organizationRegistered('factory', $factory->id, $factory->name);

        return $member;
    }

    /**
     * @param  array<string, mixed>  $details
     * @param  array{sectors: list<string>, services: list<string>}  $codes
     * @param  array{name: string, email: string, password_hash: string}  $account
     * @param  list<array{type: string, disk: string, path: string, original_name: string, mime_type: string, size_bytes: int, sha256: string}>  $documents
     */
    private function registerServiceProvider(
        array $details,
        array $codes,
        array $account,
        array $documents,
        string $registrationId,
        ?string $ipAddress,
    ): User {
        $provider = new ServiceProvider;
        $provider->fill($details);
        $provider->save();
        $provider->sectors()->sync(Sector::query()->whereIn('code', $codes['sectors'])->pluck('id'));
        $provider->services()->sync(CatalogService::query()->whereIn('code', $codes['services'])->pluck('id'));

        $member = $this->createMember(Role::ProviderMember, $provider, $account);
        $documentTypes = $this->attachDocuments($provider, $member, $documents);

        AuditLog::record(AuditEvent::ServiceProviderRegistered, $member, $provider, [
            'registration_id' => $registrationId,
            'name' => $provider->name,
            'sectors' => $codes['sectors'],
            'services' => $codes['services'],
            'documents' => $documentTypes,
        ], $ipAddress);
        MarketplaceNotifications::organizationRegistered('service_provider', $provider->id, $provider->name);

        return $member;
    }

    /**
     * @param  array{name: string, email: string, password_hash: string}  $account
     */
    private function createMember(Role $role, Factory|ServiceProvider $organization, array $account): User
    {
        $member = new User(['name' => $account['name'], 'email' => $account['email']]);
        // Already a bcrypt hash from the controller: the `hashed` cast keeps it as-is
        // (Hash::isHashed guard), so the member signs in with the chosen password.
        $member->password = $account['password_hash'];
        $member->email_verified_at = now();
        $member->role = $role;
        $member->factory_id = $organization instanceof Factory ? $organization->id : null;
        $member->service_provider_id = $organization instanceof ServiceProvider ? $organization->id : null;
        $member->save();

        return $member;
    }

    /**
     * @param  list<array{type: string, disk: string, path: string, original_name: string, mime_type: string, size_bytes: int, sha256: string}>  $documents
     * @return list<string> the document types attached
     */
    private function attachDocuments(Factory|ServiceProvider $organization, User $member, array $documents): array
    {
        $types = [];
        foreach ($documents as $document) {
            OrganizationDocument::recordStoredFile(
                $organization,
                DocumentType::from($document['type']),
                $document['disk'],
                $document['path'],
                $document['original_name'],
                $document['mime_type'],
                $document['size_bytes'],
                $document['sha256'],
                $member,
            );
            $types[] = $document['type'];
        }

        return $types;
    }
}

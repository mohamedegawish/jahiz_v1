<?php

use App\Models\CategorySuggestion;
use App\Models\ServiceProvider;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Facades\Gate;

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
});

it('lets providers see only their own suggestions while IMC sees all', function () {
    $provider = ServiceProvider::factory()->approved()->inSectors('food')->create();
    $member = User::factory()->providerMember($provider)->create();
    $suggestion = new CategorySuggestion;
    $suggestion->service_provider_id = $provider->id;
    $suggestion->created_by_user_id = $member->id;
    $suggestion->name_ar = 'تصنيف أ';
    $suggestion->save();

    $other = ServiceProvider::factory()->approved()->inSectors('food')->create();
    $otherMember = User::factory()->providerMember($other)->create();
    $admin = User::factory()->imcAdmin()->create();
    $factoryMember = User::factory()->factoryMember()->create();

    expect(Gate::forUser($member)->allows('view', $suggestion))->toBeTrue()
        ->and(Gate::forUser($otherMember)->allows('view', $suggestion))->toBeFalse()
        ->and(Gate::forUser($admin)->allows('view', $suggestion))->toBeTrue()
        ->and(Gate::forUser($factoryMember)->allows('view', $suggestion))->toBeFalse()
        ->and(Gate::forUser($member)->allows('create', CategorySuggestion::class))->toBeTrue()
        ->and(Gate::forUser($factoryMember)->allows('create', CategorySuggestion::class))->toBeFalse()
        ->and(Gate::forUser($admin)->allows('review', CategorySuggestion::class))->toBeTrue()
        ->and(Gate::forUser($member)->allows('review', CategorySuggestion::class))->toBeFalse();
});

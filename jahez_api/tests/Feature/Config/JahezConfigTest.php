<?php

/**
 * Evaluates config/jahez.php as if the given variable had the given value, restoring the
 * environment afterwards (the same pattern as SanctumConfigTest).
 *
 * @return array<string, mixed>
 */
function jahezConfigWhenEnvIs(string $variable, string $value): array
{
    $previousServerValue = $_SERVER[$variable] ?? null;
    $previousEnvValue = $_ENV[$variable] ?? null;
    $previousPutenvValue = getenv($variable);

    $_SERVER[$variable] = $_ENV[$variable] = $value;
    putenv("{$variable}={$value}");

    try {
        return require base_path('config/jahez.php');
    } finally {
        unset($_SERVER[$variable], $_ENV[$variable]);
        putenv($variable);

        if ($previousServerValue !== null) {
            $_SERVER[$variable] = $previousServerValue;
        }
        if ($previousEnvValue !== null) {
            $_ENV[$variable] = $previousEnvValue;
        }
        if ($previousPutenvValue !== false) {
            putenv("{$variable}={$previousPutenvValue}");
        }
    }
}

// docker-compose.yml passes every optional business setting to the containers, empty
// unless the operator sets it (`${VAR:-}`). An empty value must mean "not decided", as an
// unset one does, or the go-live gate fails and an empty scale would read as 0.
it('treats an empty optional business setting as not set', function (string $variable, string $key) {
    expect(data_get(jahezConfigWhenEnvIs($variable, ''), $key))->toBeNull();
})->with([
    'evaluation scale' => ['JAHEZ_PROVIDER_EVALUATION_SCALE_MAX', 'providers.evaluation.scale_max'],
    'evaluation pass mark' => ['JAHEZ_PROVIDER_EVALUATION_PASS_MARK', 'providers.evaluation.pass_mark'],
    'payment gateway' => ['JAHEZ_PAYMENT_GATEWAY', 'billing.payment_gateway'],
]);

it('requires no provider profile field when the setting is empty', function () {
    expect(data_get(jahezConfigWhenEnvIs('JAHEZ_PROVIDER_REQUIRED_FIELDS', ''), 'providers.required_profile_fields'))->toBe([]);
});

it('still reads a value the operator sets', function () {
    expect(data_get(jahezConfigWhenEnvIs('JAHEZ_PROVIDER_EVALUATION_SCALE_MAX', '5'), 'providers.evaluation.scale_max'))->toBe(5)
        ->and(data_get(jahezConfigWhenEnvIs('JAHEZ_PROVIDER_EVALUATION_PASS_MARK', '0'), 'providers.evaluation.pass_mark'))->toBe('0');
});

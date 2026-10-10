<?php

namespace App\Models;

use Database\Factories\ImcRegisteredNumberFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A factory number IMC registered (the "الرقم المسجل لدى IMC" whitelist). A factory
 * self-registration is accepted only when its IMC number matches one of these rows,
 * by the number only; the name is informational for IMC administrators.
 *
 * @property int $id
 * @property string $name
 * @property string $number
 */
class ImcRegisteredNumber extends Model
{
    /** @use HasFactory<ImcRegisteredNumberFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'number',
    ];

    /**
     * Numbers are matched after trimming, so stored trimmed.
     */
    protected static function booted(): void
    {
        static::saving(function (self $row): void {
            $row->number = trim((string) $row->number);
            $row->name = trim((string) $row->name);
        });
    }

    /**
     * Whether the number is on the whitelist (trimmed; the database collation matches
     * it case-insensitively).
     */
    public static function isRegistered(string $number): bool
    {
        $number = trim($number);

        return $number !== '' && self::query()->where('number', $number)->exists();
    }

    /**
     * Rows whose name or number contains the term, matched literally: LIKE wildcards
     * in the term are escaped.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function numberOrNameContains(Builder $query, string $term): void
    {
        $like = '%'.addcslashes($term, '%_\\').'%';
        $query->where(fn (Builder $nested) => $nested->whereLike('number', $like)->orWhereLike('name', $like));
    }
}

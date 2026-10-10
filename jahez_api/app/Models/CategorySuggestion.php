<?php

namespace App\Models;

use App\Enums\CategorySuggestionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A service category suggested by a provider (not in the workbook catalog).
 * IMC reviews it; an approved suggestion is a candidate for the next workbook
 * update — it never creates a catalog row by itself (ADR-014).
 *
 * @property int $id
 * @property int $service_provider_id
 * @property int $created_by_user_id
 * @property string $name_ar
 * @property string|null $name_en
 * @property string|null $description
 * @property string|null $reason
 * @property CategorySuggestionStatus $status
 * @property string|null $review_reason
 * @property int|null $reviewed_by_user_id
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class CategorySuggestion extends Model
{
    protected $fillable = [
        'service_provider_id',
        'created_by_user_id',
        'name_ar',
        'name_en',
        'description',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'status' => CategorySuggestionStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    protected $attributes = [
        'status' => 'pending',
    ];

    /**
     * @return BelongsTo<ServiceProvider, $this>
     */
    public function serviceProvider(): BelongsTo
    {
        return $this->belongsTo(ServiceProvider::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function isPending(): bool
    {
        return $this->status === CategorySuggestionStatus::Pending;
    }
}

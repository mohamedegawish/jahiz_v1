<?php

namespace App\Http\Resources\V1;

use App\Models\CategorySuggestion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CategorySuggestion
 */
class CategorySuggestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'service_provider_id' => $this->service_provider_id,
            'service_provider_name' => $this->whenLoaded('serviceProvider', fn () => $this->serviceProvider?->name),
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'description' => $this->description,
            'reason' => $this->reason,
            'status' => $this->status->value,
            'review_reason' => $this->review_reason,
            'reviewed_at' => $this->reviewed_at?->toIso8601ZuluString(),
            'created_at' => $this->created_at?->toIso8601ZuluString(),
        ];
    }
}

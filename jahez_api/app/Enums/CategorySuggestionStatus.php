<?php

namespace App\Enums;

/**
 * Review state of a provider-suggested service category (provider proposes, IMC disposes).
 */
enum CategorySuggestionStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}

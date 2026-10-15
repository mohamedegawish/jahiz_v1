<?php

namespace App\Notifications;

use App\Enums\NotificationEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The email copy of an in-app notification (ADR-020), queued after the event's
 * transaction commits, so a mail failure never rolls back the business change and never
 * delays the request. The email says what happened and links to the record; it never
 * carries message text, offer terms, prices or documents.
 */
class PlatformEventMail extends Notification implements ShouldQueue
{
    use Queueable;

    /** Retries on a mail transport failure, then the job fails (see failed_jobs). */
    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(
        public NotificationEvent $event,
        public string $body,
        public ?string $link,
    ) {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('جاهز: '.$this->event->title())
            ->line(self::asPlainText($this->body));

        if ($this->link !== null) {
            $message->action('عرض التفاصيل', rtrim((string) config('api.frontend_url'), '/').$this->link);
        }

        return $message->line('سجّلوا الدخول إلى منصة جاهز لمتابعة التفاصيل.');
    }

    /**
     * The body as literal text. Mail lines are rendered as Markdown and the body quotes
     * names users typed (organizations, requests, services), so a name written as a
     * Markdown link or image would become one in an official email (finding PA-25).
     * Escaping the brackets is enough: without them there is no link or image, and the
     * template already escapes HTML. The only link in the email is the action button.
     */
    public static function asPlainText(string $body): string
    {
        return strtr($body, ['\\' => '\\\\', '[' => '\\[', ']' => '\\]']);
    }
}

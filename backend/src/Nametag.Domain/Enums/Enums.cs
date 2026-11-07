namespace Nametag.Domain.Enums;

public enum Theme
{
    LIGHT,
    DARK
}

public enum DateFormat
{
    MDY,
    DMY,
    YMD
}

public enum NameOrder
{
    WESTERN,
    EASTERN
}

public enum NameDisplayFormat
{
    FULL,
    NICKNAME_PREFERRED,
    SHORT
}

public enum SubscriptionTier
{
    FREE,
    PERSONAL,
    PRO
}

public enum BillingFrequency
{
    MONTHLY,
    YEARLY
}

public enum SubscriptionStatus
{
    ACTIVE,
    CANCELED,
    PAST_DUE,
    UNPAID,
    PAUSED
}

public enum PromotionDurationType
{
    FIXED,
    RELATIVE,
    FOREVER
}

public enum PaymentStatus
{
    PENDING,
    SUCCEEDED,
    FAILED,
    REFUNDED,
    CANCELED
}

public enum CustomFieldType
{
    TEXT,
    NUMBER,
    BOOLEAN,
    SELECT
}

public enum EventStatus
{
    PLANNED,
    ONGOING,
    COMPLETED,
    CANCELLED
}

public enum ReminderType
{
    ONCE,
    RECURRING
}

public enum ReminderIntervalUnit
{
    DAYS,
    WEEKS,
    MONTHS,
    YEARS
}


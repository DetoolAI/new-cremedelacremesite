import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as bookingConfirmation } from './booking-confirmation'
import { template as membershipEnrollment } from './membership-enrollment'
import { template as newsletterSignup } from './newsletter-signup'
import { template as accountSignup } from './account-signup'
import { template as partyInquiry } from './party-inquiry'
import { template as membershipRedemption } from './membership-redemption'
import { template as contactInquiry } from './contact-inquiry'
import { template as memberMagicLink } from './member-magic-link'
import { template as memberMonthStart } from './member-month-start'
import { template as memberMidMonth } from './member-mid-month'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'membership-enrollment': membershipEnrollment,
  'newsletter-signup': newsletterSignup,
  'account-signup': accountSignup,
  'party-inquiry': partyInquiry,
  'membership-redemption': membershipRedemption,
  'contact-inquiry': contactInquiry,
  'member-magic-link': memberMagicLink,
  'member-month-start': memberMonthStart,
  'member-mid-month': memberMidMonth,
}

import { Img, Section } from '@react-email/components'

/**
 * Shared logo header for all transactional + auth emails.
 * Uses the absolute URL on the production domain so it renders in any client.
 */
export const EMAIL_LOGO_URL = 'https://cremedelacremenails.com/email-logo.png'

export function EmailLogo() {
  return (
    <Section style={{ textAlign: 'center', padding: '8px 0 18px' }}>
      <Img
        src={EMAIL_LOGO_URL}
        alt="Crème de la Crème Nails"
        width="140"
        style={{ display: 'inline-block', margin: '0 auto', height: 'auto' }}
      />
    </Section>
  )
}

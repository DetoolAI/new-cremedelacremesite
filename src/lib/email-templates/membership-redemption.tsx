import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

import { EmailLogo } from './_logo'
const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  customerName?: string
  benefitLabel?: string
  redeemedAt?: string
  tierName?: string
  remainingLabel?: string
  lowBalance?: boolean
  membershipCardUrl?: string
  redeemedByName?: string
  bookingUrl?: string
}

const MembershipRedemption = ({
  customerName = 'there',
  benefitLabel = 'a service',
  redeemedAt,
  tierName = 'Membership',
  remainingLabel,
  lowBalance = false,
  membershipCardUrl,
  redeemedByName,
  bookingUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Service redeemed — thank you for visiting {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME DE LA CRÈME · THE NAILS CLUB</Text>
        <Heading style={h1}>Thanks for visiting, {customerName}.</Heading>
        <Text style={text}>
          Your <strong>{benefitLabel}</strong> has been redeemed{redeemedByName ? <> by <strong>{redeemedByName}</strong></> : null} as part of your{' '}
          <strong>{tierName}</strong> membership. We loved having you in.
        </Text>

        {lowBalance && (
          <Section style={lowBalanceCard}>
            <Text style={lowBalanceText}>
              <strong>Heads up —</strong> {remainingLabel ?? 'this was your last service this month'}.
              Your benefits refresh on your next billing date.
            </Text>
          </Section>
        )}

        <Heading as="h2" style={h2}>Visit details</Heading>
        <Section style={card}>
          <Row label="Service" value={benefitLabel} />
          {redeemedAt && <Row label="Redeemed" value={new Date(redeemedAt).toLocaleString('en-US')} />}
          {redeemedByName && <Row label="Checked in by" value={redeemedByName} />}
          <Row label="Membership" value={tierName} />
          {remainingLabel && <Row label="Remaining this month" value={remainingLabel} />}
        </Section>

        {membershipCardUrl && (
          <>
            <Text style={text}>
              Your digital membership card is always available here:
            </Text>
            <Section style={card}>
              <Text style={{ ...rowValue, wordBreak: 'break-all' as const }}>
                <a href={membershipCardUrl} style={{ color: '#7a1f0e' }}>
                  {membershipCardUrl}
                </a>
              </Text>
            </Section>
          </>
        )}

        {bookingUrl && (
          <Section style={ctaWrap}>
            <a href={bookingUrl} style={ctaButton}>Book your next visit</a>
          </Section>
        )}

        <Text style={text}>
          Questions? Reply to this email, email us at{' '}
          <a href="mailto:angie@cremedelacremenails.com" style={{ color: '#7a1f0e' }}>
            <strong>angie@cremedelacremenails.com</strong>
          </a>
          , or call{' '}
          <a href="tel:+13478808282" style={{ color: '#7a1f0e' }}>
            <strong>(347) 880-8282</strong>
          </a>
          .
        </Text>

        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · 4413 Broadway 189ST, New York, NY 10040</Text>
      </Container>
    </Body>
  </Html>
)

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Section style={{ padding: '10px 0', borderBottom: '1px solid #f0e7df' }}>
      <Text style={rowLabel}>{label}</Text>
      <Text style={{ ...rowValue, whiteSpace: 'pre-line' }}>{value}</Text>
    </Section>
  )
}

export const template = {
  component: MembershipRedemption,
  subject: (data: Record<string, any>) =>
    `Your ${data?.benefitLabel ?? 'service'} at ${SITE_NAME}`,
  displayName: 'Membership redemption',
  previewData: {
    customerName: 'Jane',
    benefitLabel: 'Regular Pedicure',
    redeemedAt: new Date().toISOString(),
    tierName: 'Regular Pedi Only',
    remainingLabel: '1 of 2 remaining',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brandLabel = { fontSize: '10px', letterSpacing: '0.28em', color: '#a07c4d', margin: '0 0 18px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1410', margin: '0 0 18px', lineHeight: '1.25' }
const h2 = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1f1410', margin: '24px 0 8px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }
const text = { fontSize: '14px', color: '#55454a', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#fbf6f0', border: '1px solid #f0e7df', borderRadius: '4px', padding: '8px 18px', margin: '8px 0 12px' }
const rowLabel = { fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#a07c4d', margin: '0 0 4px' }
const rowValue = { fontSize: '14px', color: '#1f1410', margin: '0', fontWeight: 500 as const }
const hr = { border: 'none', borderTop: '1px solid #f0e7df', margin: '28px 0 14px' }
const footer = { fontSize: '11px', color: '#a8a0a3', textAlign: 'center' as const, margin: '0' }
const lowBalanceCard = { backgroundColor: '#fef3e8', border: '1px solid #f0c89a', borderRadius: '4px', padding: '12px 18px', margin: '0 0 18px' }
const lowBalanceText = { fontSize: '13px', color: '#7a3f0e', lineHeight: '1.55', margin: '0' }
const ctaWrap = { textAlign: 'center' as const, margin: '8px 0 22px' }
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#7a1f0e',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
}

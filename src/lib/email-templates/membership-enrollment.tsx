import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  customerName?: string
  customerEmail?: string
  phone?: string
  tierName?: string
  monthlyPrice?: string
  billingAddress?: string
  notes?: string
  isAdmin?: boolean
  subscriptionStatus?: string
  squareSubscriptionId?: string
  membershipCardUrl?: string
  memberPortalUrl?: string
  membershipId?: string
  customerInitials?: string
  signatureDataUrl?: string
  amountCharged?: string
  signedAt?: string
  billingCadence?: string
  logoUrl?: string
}

const MembershipEnrollment = ({
  customerName = 'there',
  customerEmail,
  phone = '',
  tierName = 'Membership',
  monthlyPrice = '',
  billingAddress = '',
  notes,
  isAdmin = false,
  subscriptionStatus,
  squareSubscriptionId,
  membershipCardUrl,
  memberPortalUrl,
  customerInitials,
  signatureDataUrl,
  amountCharged,
  signedAt,
  membershipId,
  billingCadence = 'Month-to-month, auto-renews monthly',
  logoUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isAdmin
        ? `New membership signup — ${customerName} (${tierName})`
        : `Welcome to The Nails Club, ${customerName}!`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {logoUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '0 0 18px' }}>
            <Img src={logoUrl} alt="Crème de la Crème Nails" width="120" style={{ display: 'inline-block', margin: '0 auto' }} />
          </Section>
        )}
        <Text style={brandLabel}>CRÈME DE LA CRÈME · THE NAILS CLUB</Text>
        <Heading style={h1}>
          {isAdmin
            ? `New membership signup`
            : `Welcome to The Nails Club, ${customerName}.`}
        </Heading>
        <Text style={text}>
          {isAdmin
            ? `${customerName} just enrolled in the ${tierName} membership. Card is saved on file with Square.`
            : `Your card has been securely saved with Square and your monthly ${tierName} membership is set up. We'll see you each month — no need to re-enter payment details.`}
        </Text>

        <Heading as="h2" style={h2}>Membership details</Heading>
        <Section style={card}>
          {membershipId && <Row label="Member #" value={membershipId.slice(0, 8).toUpperCase()} />}
          <Row label="Tier" value={tierName} />
          <Row label="Monthly price" value={monthlyPrice} />
          <Row label="Billing cadence" value={billingCadence} />
          {isAdmin && customerEmail && <Row label="Customer Email" value={customerEmail} />}
          {isAdmin && <Row label="Phone" value={phone} />}
          {isAdmin && <Row label="Billing Address" value={billingAddress} />}
          {notes && <Row label="Notes" value={notes} />}
        </Section>

        {!isAdmin && (
          <Text style={text}>
            This is a <strong>month-to-month</strong> membership. Your card will be charged{' '}
            <strong>{monthlyPrice}</strong> automatically each month on the same day as today,
            until you cancel. You can cancel anytime by emailing or calling us — we just ask for
            7 days' notice before your next billing date.
          </Text>
        )}

        {isAdmin && (
          <>
            <Heading as="h2" style={h2}>Payment & charge</Heading>
            <Section style={card}>
              {amountCharged && <Row label="Charged today" value={amountCharged} />}
              {amountCharged && <Row label="Recurring monthly" value={amountCharged} />}
              <Row label="Subscription Status" value={subscriptionStatus ?? 'pending'} />
              {squareSubscriptionId && <Row label="Subscription ID" value={squareSubscriptionId} />}
            </Section>

            <Heading as="h2" style={h2}>Signed agreement</Heading>
            <Section style={card}>
              {customerInitials && <Row label="Initials" value={customerInitials} />}
              {signedAt && <Row label="Signed At" value={new Date(signedAt).toLocaleString('en-US')} />}
              <Row label="Agreement" value={`Customer agreed to month-to-month auto-renewing ${tierName} membership at ${monthlyPrice}/month, with 7-day cancellation notice.`} />
            </Section>
            {signatureDataUrl && (
              <Section style={{ ...card, textAlign: 'center' as const }}>
                <Text style={rowLabel}>Signature</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={signatureDataUrl} style={{ maxWidth: '100%', height: 'auto', backgroundColor: '#fff', border: '1px solid #f0e7df', borderRadius: '4px' }} />
              </Section>
            )}
          </>
        )}

        {!isAdmin && (
          <>
            <Heading as="h2" style={h2}>Your digital membership card</Heading>
            <Text style={text}>
              Save the link below to your phone. Show the QR code at the front desk
              for instant check-in — and Square will email you a receipt automatically each month.
            </Text>
            {membershipCardUrl && (
              <Section style={card}>
                <Text style={{ ...rowValue, wordBreak: 'break-all' as const }}>
                  <a href={membershipCardUrl} style={{ color: '#7a1f0e' }}>
                    {membershipCardUrl}
                  </a>
                </Text>
              </Section>
            )}
            {memberPortalUrl && (
              <>
                <Heading as="h2" style={h2}>Members area — book your free visits</Heading>
                <Text style={text}>
                  Sign in to your member account to book your free monthly visits
                  (no payment required) and manage your membership.
                </Text>
                <Section style={{ ...card, backgroundColor: '#fff8ee', borderColor: '#e8c896' }}>
                  <Text style={{ ...rowLabel, color: '#7a1f0e' }}>First time? Quick setup</Text>
                  <Text style={{ fontSize: '13px', color: '#1f1410', margin: '0 0 6px', lineHeight: '1.6' }}>
                    1. Open the link below.<br />
                    2. Tap <strong>"First time? Create a password"</strong>.<br />
                    3. Enter <strong>this email ({customerEmail})</strong> and <strong>make up any password</strong> you like (at least 6 characters — anything you'll remember).<br />
                    4. <strong>Write your password down or save it in your phone</strong> — you'll use it every time you sign in.<br />
                    5. Check your inbox for a verification email, tap the link, then come back and sign in.
                  </Text>
                </Section>
                <Section style={card}>
                  <Text style={{ ...rowValue, wordBreak: 'break-all' as const }}>
                    <a href={memberPortalUrl} style={{ color: '#7a1f0e' }}>
                      {memberPortalUrl}
                    </a>
                  </Text>
                </Section>
                <Text style={{ ...text, fontSize: '12px', color: '#a07c4d' }}>
                  Important: you must use <strong>{customerEmail}</strong> to sign in —
                  that's how we link your account to your monthly benefits.
                </Text>
              </>
            )}
            <Text style={text}>
              Questions about your membership? Reply to this email or call/text us at{' '}
              <Link href="tel:+13478808282" style={{ color: '#7a1f0e', fontWeight: 700, textDecoration: 'underline' }}>
                (347) 880-8282
              </Link>
              . You can cancel anytime — just let us know.
            </Text>
          </>
        )}

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
  component: MembershipEnrollment,
  subject: (data: Record<string, any>) =>
    data?.isAdmin
      ? `New membership — ${data.customerName ?? 'Customer'} (${data.tierName ?? ''})`
      : `Welcome to The Nails Club at ${SITE_NAME}`,
  displayName: 'Membership enrollment',
  previewData: {
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    phone: '+1 (212) 555-1234',
    tierName: 'Builder / Gel',
    monthlyPrice: '$95.00',
    billingAddress: '123 Broadway\nApt 4\nNew York, NY 10040\nUS',
    isAdmin: false,
    subscriptionStatus: 'active',
    squareSubscriptionId: 'sub_abc123',
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

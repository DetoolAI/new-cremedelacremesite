import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

import { EmailLogo } from './_logo'
const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  customerName?: string
  customerEmail?: string
  serviceName?: string
  serviceCategory?: string
  servicePrice?: string
  staffName?: string
  appointmentDate?: string
  appointmentTime?: string
  phone?: string
  notes?: string
  isAdmin?: boolean
  depositPaid?: string
  feePaid?: string
  chargedToday?: string
  balanceDue?: string
  squarePaymentId?: string
  squareBookingId?: string
  squareSyncError?: string
}

const BookingConfirmation = ({
  customerName = 'there',
  customerEmail,
  serviceName = 'your service',
  serviceCategory,
  servicePrice,
  staffName = 'Any Available Technician',
  appointmentDate = '',
  appointmentTime = '',
  phone = '',
  notes,
  isAdmin = false,
  depositPaid = '$20.00',
  feePaid = '$2.00',
  chargedToday = '$22.00',
  balanceDue,
  squarePaymentId,
  squareBookingId,
  squareSyncError,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isAdmin
        ? `New booking — ${customerName} · ${appointmentDate}`
        : `Your appointment at ${SITE_NAME} is confirmed`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME DE LA CRÈME · NAILS</Text>
        <Heading style={h1}>
          {isAdmin ? `New booking from ${customerName}` : `Your appointment is confirmed, ${customerName}!`}
        </Heading>
        <Text style={text}>
          {isAdmin
            ? 'A deposit was just paid and a new appointment booked through the website. Details below.'
            : "Thank you — your deposit has been received and your appointment is locked in. Here are your details:"}
        </Text>

        <Section style={card}>
          <Row label="Service" value={servicePrice ? `${serviceName} (${servicePrice})` : serviceName} />
          {serviceCategory && <Row label="Category" value={serviceCategory} />}
          <Row label="Technician" value={staffName} />
          <Row label="Date" value={appointmentDate} />
          <Row label="Time" value={appointmentTime} />
          {isAdmin && customerEmail && <Row label="Customer Email" value={customerEmail} />}
          {isAdmin && <Row label="Phone" value={phone} />}
          {notes && <Row label="Notes" value={notes} />}
        </Section>

        <Heading as="h2" style={h2}>Payment breakdown</Heading>
        <Section style={card}>
          {servicePrice && (
            <PayRowExplained
              label="Service price"
              value={servicePrice}
              note={serviceName ? `Full price for ${serviceName}.` : 'Full price of your selected service.'}
            />
          )}
          <PayRowExplained
            label="Deposit paid today"
            value={depositPaid}
            note="A flat $20 hold that secures your appointment slot. It is fully credited toward your service balance — you are NOT being charged extra. Forfeited only for no-shows or late arrivals."
            highlight
          />
          <PayRowExplained
            label="Processing fee"
            value={feePaid}
            note="A flat $2 covers the secure card-processing cost (Square). This is the only fee — there are no hidden charges."
          />
          <PayRow label="Total charged today" value={chargedToday} bold />
          {balanceDue ? (
            <PayRowExplained
              label="Balance due at the salon"
              value={balanceDue}
              note="Service price minus your $20 deposit. Pay in-salon by card, cash, Apple Pay, or Cash App at the end of your service."
              bold
              accent
            />
          ) : (
            <PayRowExplained
              label="Balance due at the salon"
              value="Pay remaining in-salon"
              note="Your $20 deposit is credited toward your final bill. Pay the rest in-salon by card, cash, Apple Pay, or Cash App."
              accent
            />
          )}
        </Section>
        <Text style={textSm}>
          <strong>Why a deposit?</strong> It protects our technicians' time. Without one, no-shows
          would mean lost income for them. The $20 is yours — it always counts toward your bill
          unless you no-show or arrive late.
        </Text>
        {isAdmin && squarePaymentId && (
          <Text style={textSm}>Square payment ID: <code>{squarePaymentId}</code></Text>
        )}
        {isAdmin && squareBookingId && (
          <Text style={textSm}>
            ✅ Synced to Square Appointments calendar (booking ID: <code>{squareBookingId}</code>)
          </Text>
        )}
        {isAdmin && squareSyncError && (
          <Text style={{ ...textSm, color: '#7a1f0e', backgroundColor: '#fff4ec', border: '1px solid #f0c8b0', borderRadius: '4px', padding: '10px 12px' }}>
            ⚠️ <strong>Square calendar sync failed:</strong> {squareSyncError}
            <br />Please add this appointment to Square manually.
          </Text>
        )}

        {!isAdmin && (
          <>
            <Heading as="h2" style={h2}>Getting here</Heading>
            <Section style={card}>
              <Text style={{ ...rowValue, marginBottom: '8px' }}>
                <strong>Crème de la Crème Nails</strong><br />
                4413 Broadway, Suite 189ST<br />
                New York, NY 10040
              </Text>
              <Text style={{ fontSize: '12px', color: '#55454a', lineHeight: '1.6', margin: '8px 0 0' }}>
                <strong style={{ color: '#7a1f0e' }}>🚇 Subway:</strong> A train to <strong>190 St</strong> (1 block away) ·
                1 train to <strong>191 St</strong> (5 min walk).<br />
                <strong style={{ color: '#7a1f0e' }}>🚌 Bus:</strong> M4, M98, Bx7, Bx20 all stop at Broadway & W 190 St.<br />
                <strong style={{ color: '#7a1f0e' }}>🚗 Parking:</strong> Metered street parking on Broadway. Garage at
                Fort Tryon Park (4499 Broadway) ~3 min walk.
              </Text>
              <Text style={{ fontSize: '12px', margin: '10px 0 0' }}>
                <a
                  href="https://maps.google.com/?q=4413+Broadway+New+York+NY+10040"
                  style={{ color: '#7a1f0e', textDecoration: 'underline', fontWeight: 600 }}
                >
                  📍 Open in Google Maps
                </a>
              </Text>
            </Section>

            <Section style={{ backgroundColor: '#fff7e6', border: '1px solid #f3c969', borderRadius: '4px', padding: '14px 16px', margin: '20px 0' }}>
              <Text style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a5a10', margin: '0 0 8px', fontWeight: 700 }}>
                Our Booking Policy
              </Text>
              <Text style={{ fontSize: '13px', color: '#5a4310', lineHeight: '1.55', margin: '0 0 10px' }}>
                A <strong>$20 deposit</strong> is required per person and applied to your balance —
                <strong> unless your appointment is missed or you arrive late</strong>, in which case the
                deposit is forfeited. Deposit is non-refundable. For any changes, please call or
                text us at <strong>(347) 880-8282</strong>.
              </Text>
              <Text style={{ fontSize: '12px', color: '#7a6a3a', lineHeight: '1.5', margin: '0', fontStyle: 'italic' }}>
                Citas requieren un depósito de $20 p/p, deducido del balance, o se pierde si falta o
                llega tarde. No reembolsable. Para cambios, llámenos o envíe mensaje al (347) 880-8282.
              </Text>
            </Section>
            <Text style={text}>
              Questions? Reply to this email or call us at{' '}
              <strong style={{ color: '#7a1f0e' }}>(347) 880-8282</strong>.
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
      <Text style={rowValue}>{value}</Text>
    </Section>
  )
}

function PayRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <Section style={{ padding: '8px 0', borderBottom: '1px solid #f0e7df' }}>
      <table width="100%" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ fontSize: '13px', color: accent ? '#7a1f0e' : '#55454a', fontWeight: bold ? 600 : 400 }}>{label}</td>
            <td style={{ fontSize: '14px', color: accent ? '#7a1f0e' : '#1f1410', fontWeight: bold ? 700 : 500, textAlign: 'right' }}>{value}</td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}

function PayRowExplained({
  label, value, note, bold, accent, highlight,
}: { label: string; value: string; note: string; bold?: boolean; accent?: boolean; highlight?: boolean }) {
  return (
    <Section style={{
      padding: '10px 0',
      borderBottom: '1px solid #f0e7df',
      backgroundColor: highlight ? '#fdf6ec' : 'transparent',
    }}>
      <table width="100%" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ fontSize: '13px', color: accent ? '#7a1f0e' : '#55454a', fontWeight: bold ? 600 : 500, paddingBottom: '4px' }}>
              {label}
            </td>
            <td style={{ fontSize: '14px', color: accent ? '#7a1f0e' : '#1f1410', fontWeight: bold ? 700 : 600, textAlign: 'right', paddingBottom: '4px' }}>
              {value}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ fontSize: '11px', color: '#7a6a6f', lineHeight: '1.5', fontStyle: 'italic' }}>
              {note}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}

export const template = {
  component: BookingConfirmation,
  subject: (data: Record<string, any>) =>
    data?.isAdmin
      ? `New booking — ${data.customerName ?? 'Customer'} · ${data.appointmentDate ?? ''}`
      : `Your appointment at ${SITE_NAME} is confirmed`,
  displayName: 'Booking confirmation',
  previewData: {
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    serviceName: 'Acrylic Full Set',
    serviceCategory: 'Extensions',
    servicePrice: '$40',
    staffName: 'Angie',
    appointmentDate: 'Saturday, May 4, 2026',
    appointmentTime: '2:30 PM',
    phone: '+1 (212) 555-1234',
    notes: 'Allergic to citrus scents.',
    isAdmin: false,
    depositPaid: '$20.00',
    feePaid: '$2.00',
    chargedToday: '$22.00',
    balanceDue: '$20.00',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brandLabel = { fontSize: '10px', letterSpacing: '0.28em', color: '#a07c4d', margin: '0 0 18px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1410', margin: '0 0 18px', lineHeight: '1.25' }
const h2 = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1f1410', margin: '24px 0 8px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }
const text = { fontSize: '14px', color: '#55454a', lineHeight: '1.6', margin: '0 0 18px' }
const textSm = { fontSize: '12px', color: '#7a6a6f', lineHeight: '1.5', margin: '8px 0 18px' }
const card = { backgroundColor: '#fbf6f0', border: '1px solid #f0e7df', borderRadius: '4px', padding: '8px 18px', margin: '8px 0 12px' }
const rowLabel = { fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#a07c4d', margin: '0 0 4px' }
const rowValue = { fontSize: '14px', color: '#1f1410', margin: '0', fontWeight: 500 as const }
const hr = { border: 'none', borderTop: '1px solid #f0e7df', margin: '28px 0 14px' }
const footer = { fontSize: '11px', color: '#a8a0a3', textAlign: 'center' as const, margin: '0' }

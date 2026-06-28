import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { formatPrice } from "@/lib/format";
import type { OrderDTO } from "@/lib/orders/queries";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

/**
 * Admin alert email sent when Printful order submission fails after payment.
 * Flags the order for manual intervention (see plans/007).
 */
export function AdminFailureAlertEmail({
  order,
  error,
}: {
  order: OrderDTO;
  error: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        ACTION NEEDED: Printful submission failed for order {order.orderNumber}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Printful submission failed</Heading>
          <Text style={text}>
            Order <strong>{order.orderNumber}</strong> was paid but could not be
            submitted to Printful. The customer has been charged and the order
            needs manual intervention.
          </Text>

          <Section style={card}>
            <Text style={label}>Order number</Text>
            <Text style={value}>{order.orderNumber}</Text>
            <Text style={label}>Customer email</Text>
            <Text style={value}>{order.email}</Text>
            <Text style={label}>Total</Text>
            <Text style={value}>{formatPrice(order.totalCents)}</Text>
            <Hr style={hr} />
            <Text style={label}>Error</Text>
            <Text style={{ ...value, color: "#c0392b" }}>{error}</Text>
          </Section>

          <Section style={card}>
            <Text style={label}>Shipping address</Text>
            <Text style={value}>
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2
                ? `, ${order.shippingAddress.line2}`
                : ""}
              <br />
              {order.shippingAddress.zip} {order.shippingAddress.city}
              <br />
              {order.shippingAddress.countryCode}
            </Text>
          </Section>

          <Text style={text}>
            Review and retry:{" "}
            <a href={`${siteUrl}/admin/orders/${order.id}`} style={link}>
              {siteUrl}/admin/orders/{order.id}
            </a>
          </Text>

          <Hr style={hr} />
          <Text style={muted}>
            Automated admin alert - no action required by the customer. Do not
            reply to this message.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#faf8f3",
  fontFamily: "Inter, system-ui, sans-serif",
  margin: 0,
  padding: 0,
};
const container = { maxWidth: "560px", margin: "0 auto", padding: "24px" };
const h1 = { color: "#c0392b", fontSize: "24px", marginBottom: "16px" };
const text = { color: "#1a1a1a", fontSize: "14px", lineHeight: "20px" };
const muted = { color: "#6b7280", fontSize: "12px", textAlign: "center" as const };
const label = { color: "#6b7280", fontSize: "12px", margin: 0 };
const value = { color: "#1a1a1a", fontSize: "14px", margin: "2px 0 0 0" };
const card = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};
const hr = { borderColor: "#e5e0d8", margin: "12px 0" };
const link = { color: "#2d5a4f", textDecoration: "underline" };

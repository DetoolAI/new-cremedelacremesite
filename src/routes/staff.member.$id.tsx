import { createFileRoute, useParams } from "@tanstack/react-router";
import { MembershipCardPage } from "./membership-card";

export const Route = createFileRoute("/staff/member/$id")({
  head: () => ({
    meta: [
      { title: "Member — Staff Check-in" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffMemberPage,
});

function StaffMemberPage() {
  const { id } = useParams({ from: "/staff/member/$id" });
  return <MembershipCardPage id={id} staffView />;
}

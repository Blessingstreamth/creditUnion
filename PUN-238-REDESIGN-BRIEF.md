# PUN-238 Redesign Brief (CTO)

## 1) Goal
Redesign แอป Credit Union ให้ทันสมัย ใช้ง่ายบนมือถือ และรองรับฟังก์ชันหลักครบสำหรับสมาชิก, เจ้าหน้าที่, และผู้อนุมัติ โดยลดจำนวนขั้นตอนสำคัญในการทำงานรายวัน

## 2) Product Principles
- Clarity first: หน้าจอหลักต้องสื่อสถานะการเงินและงานค้างภายใน 5 วินาที
- Trust by design: ทุกตัวเลขสำคัญมีที่มาและเวลาอัปเดตชัดเจน
- Guided actions: งานที่ควรทำต่อไปแสดงเป็น action ชัดเจน
- Mobile-first: ออกแบบสำหรับมือถือเป็นหลัก แล้วขยาย desktop
- Accessibility baseline: touch target >= 44px, contrast >= WCAG AA

## 3) Information Architecture
- Auth
  - Login
  - Forgot PIN/Password
- Dashboard
  - Account summary cards
  - Outstanding loans
  - Due-soon payments
  - Approvals queue (role-based)
- Members
  - Member list/search
  - Member profile
  - Savings history
  - Loan history
- Loans
  - Loan list (filter: status/type/branch)
  - Loan detail
  - Repayment schedule
  - Create loan request
- Approvals
  - Pending approvals
  - Approval detail + risk summary
  - Decision log
- Transactions
  - Cash in/out
  - Transfer
  - Receipt history
- Reports
  - Daily summary
  - Portfolio health
  - Delinquency report
- Settings
  - Profile
  - Role permissions (admin)
  - Notification preferences

## 4) UX Standards
- Navigation
  - Bottom tab: Dashboard, Members, Loans, Approvals, More
  - In-module stack navigation with clear back path
- Form patterns
  - Multi-step forms (max 5 steps)
  - Inline validation + sticky CTA
- Status model
  - Loan statuses: draft, submitted, under_review, approved, rejected, disbursed, closed
  - Use semantic color + icon + text (never color alone)
- Empty/loading/error states
  - Every list/detail screenต้องมี skeleton, empty hint, retry action

## 5) Visual Direction (Figma-ready)
- Typography
  - Heading: Manrope
  - Body: Noto Sans Thai
- Color tokens
  - Primary: #0D9488 (teal)
  - Accent: #F59E0B (amber)
  - Neutral text: #0F172A / #334155 / #64748B
  - Surface: #F8FAFC / #FFFFFF
  - Success/Warning/Error: #16A34A / #D97706 / #DC2626
- Spacing scale: 4, 8, 12, 16, 24, 32
- Radius scale: 8, 12, 16
- Shadow: subtle, single elevation system

## 6) Component Inventory
- Core
  - AppHeader, SegmentControl, SummaryCard, DataRow, StatusChip
- Input
  - TextField, NumberField, Select, DatePicker, AttachmentPicker
- Workflow
  - Stepper, ApprovalTimeline, AuditLogTable
- Feedback
  - Toast, InlineError, ConfirmSheet, SuccessState

## 7) Key Screens to Design First (MVP Redesign)
- Login + PIN fallback
- Dashboard (3 role variants)
- Loan List + filter sheet
- Loan Detail + repayment schedule
- Approval Queue + Approval Detail
- Member Detail

## 8) Definition of Done for Design Pack
- Figma file includes:
  - color/text/elevation tokens
  - reusable components with variants
  - mobile frames for key screens
  - clickable prototype for loan approval flow
- Handoff includes:
  - redlines (spacing, typography)
  - interaction notes
  - API data mapping per screen

## 9) Risks and Constraints
- If existing API lacks fields for risk summary, Engineer must add backend adapter layer
- If role permissions are inconsistent, enforce UI guard + backend authorization parity
- Avoid introducing new business rules in UI without backend confirmation

## 10) Ownership
- CTO: design direction, architecture constraints, acceptance gate
- Engineer: implementation from design system + screens

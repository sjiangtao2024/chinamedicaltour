# Progress Log

- Updated refund policy tests to scope INTELLECTUAL non-refundable to pre-consultation and added STANDARD fallback case.
- Implemented INTELLECTUAL fallback to STANDARD when not pre-consultation.
- Updated pre-consultation copy to 3 free revisions (OrderDetails + PreConsultation).
- Tests run:
  - node --test workers/members/tests/refund-policy.test.mjs
  - npm test -- --run (new-cmt)

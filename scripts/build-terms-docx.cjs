const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  HeadingLevel,
  LevelFormat,
} = require("docx");

const OUTPUT_DIR = path.join(__dirname, "..", "docs");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "terms-conditions-bilingual.docx");

const lastUpdated = "2025-12-28";

const clauses = [
  {
    no: "1",
    en: "Services Overview: We provide medical travel coordination, information, and concierge support in Beijing and Chengdu. We do not provide medical diagnosis or treatment services.",
    zh: "服务概述：我们提供北京与成都的医疗旅行协调、信息与礼宾支持。我们不提供医疗诊断或治疗服务。",
  },
  {
    no: "2",
    en: "Medical Disclaimer: Content on this site is for informational purposes only. It is not medical advice and should not replace professional medical consultation.",
    zh: "医疗免责声明：本站内容仅供信息参考，不构成医疗建议，且不应替代专业医疗咨询。",
  },
  {
    no: "3",
    en: "Visa & Travel Disclaimer: We do not issue invitation letters or handle visa applications. Visa approvals and travel permissions are the responsibility of the traveler and relevant authorities.",
    zh: "签证与旅行免责声明：我们不出具邀请函或办理签证申请。签证批准与旅行许可由旅客及相关主管部门负责。",
  },
  {
    no: "4",
    en: "Availability: We do not guarantee 24/7 support availability. Response times may vary by channel and time zone.",
    zh: "可用性：我们不保证 24/7 支持可用。响应时间可能因沟通渠道与时区不同而有所差异。",
  },
  {
    no: "5",
    en: "User Responsibilities: Provide accurate and complete information; comply with local laws and travel requirements; respect privacy and safety rules of partner hospitals.",
    zh: "用户责任：提供准确完整的信息；遵守当地法律与旅行要求；尊重合作医院的隐私与安全规定。",
  },
  {
    no: "6",
    en: "Payments: Payment methods and fees are described on our How to Pay page. Payment processors handle transactions securely.",
    zh: "付款：付款方式与费用详见“如何付款”页面。支付处理方将安全处理交易。",
  },
  {
    no: "7.1",
    en: "Deposit payments are accepted via PayPal, Alipay, and WeChat Pay. Balance payments are completed on-site via Alipay, WeChat Pay, or card present.",
    zh: "订金可通过 PayPal、支付宝或微信支付。尾款在现场通过支付宝、微信或刷卡完成。",
  },
  {
    no: "7.2",
    en: "Digital services are delivered immediately after payment. Once access is granted or content is downloaded, the service is non-refundable.",
    zh: "数字服务在付款后立即提供。一旦开通访问或内容被下载，服务不予退款。",
  },
  {
    no: "7.3",
    en: "Deposits reserve medical resources and appointment slots and are non-refundable once the appointment is confirmed.",
    zh: "订金用于锁定医疗资源与预约名额，预约确认后订金不可退还。",
  },
  {
    no: "7.4",
    en: "For cancellations made at least 7 days prior to arrival, the balance payment is eligible for an 80% refund. No refund is available for cancellations within 24 hours of arrival.",
    zh: "如在抵达前至少 7 天取消，尾款可退还 80%。抵达前 24 小时内取消不予退款。",
  },
  {
    no: "7.5",
    en: "You authorize us to collect passport information solely for appointment registration and verification. Data is encrypted and retained only as long as necessary for the service.",
    zh: "您授权我们仅为预约登记与核验而收集护照信息。数据将加密并仅在提供服务所必需的期限内保存。",
  },
  {
    no: "7.6",
    en: "We act solely as a facilitator and booking agent. All medical services are provided by licensed third-party hospitals.",
    zh: "我们仅作为协助方与预约代理。所有医疗服务由持牌第三方医院提供。",
  },
  {
    no: "7.7",
    en: "If a deposit agreement requires electronic signature, you agree that your e-signature is legally binding.",
    zh: "如订金协议需要电子签署，您同意电子签名具备法律效力。",
  },
  {
    no: "8",
    en: "Limitation of Liability: We are not liable for decisions by medical providers, travel authorities, or any outcomes related to visas, travel delays, or medical services provided by third parties.",
    zh: "责任限制：我们不对医疗机构或旅行主管部门的决定承担责任，也不对与签证、旅行延误或第三方医疗服务相关的结果承担责任。",
  },
  {
    no: "9",
    en: "Changes to Terms: We may update these terms from time to time. Continued use of the site indicates acceptance of the updated terms.",
    zh: "条款变更：我们可能不时更新本条款。继续使用本网站即表示接受更新后的条款。",
  },
  {
    no: "10",
    en: "Governing Law: These terms are governed by the laws of the People’s Republic of China, without regard to conflict-of-law rules.",
    zh: "适用法律：本条款受中华人民共和国法律管辖，不考虑法律冲突规则。",
  },
  {
    no: "11",
    en: "Questions: Contact us via the contact page for any questions about these terms.",
    zh: "咨询：如对本条款有任何疑问，请通过联系页面与我们联系。",
  },
  {
    no: "12.1",
    en: "Payment Page Acknowledgement: I agree to the Terms and Conditions and Privacy Policy.",
    zh: "支付页确认：我同意服务条款与隐私政策。",
  },
  {
    no: "12.2",
    en: "Payment Page Acknowledgement: I understand this includes immediate digital services, and I waive any cooling-off period once content is accessed or downloaded.",
    zh: "支付页确认：我理解包含即时数字服务，一旦内容被访问或下载，我放弃任何冷静期。",
  },
  {
    no: "12.3",
    en: "Payment Page Acknowledgement: I understand deposits can be paid via PayPal, Alipay, or WeChat Pay, while balance payments are completed on-site by Alipay, WeChat Pay, or card present.",
    zh: "支付页确认：我理解订金可通过 PayPal、支付宝或微信支付，尾款在现场通过支付宝、微信或刷卡完成。",
  },
  {
    no: "12.4",
    en: "Payment Page Detail (Digital service clause): This purchase provides digital membership access and materials. Access is granted immediately after payment. The service is non-refundable once access is granted or content is downloaded.",
    zh: "支付页细则（数字服务条款）：本次购买提供数字会员访问与资料。付款后即刻开通访问。一旦开通访问或内容被下载，服务不予退款。",
  },
  {
    no: "12.5",
    en: "Payment Page Detail (Deposit clause): The deposit reserves medical resources and appointment slots. The deposit is non-refundable once the appointment is confirmed. For cancellations made at least 7 days prior to arrival, the balance payment is eligible for an 80% refund. No refund is available for cancellations within 24 hours of arrival.",
    zh: "支付页细则（订金条款）：订金用于锁定医疗资源与预约名额。预约确认后订金不可退还。如在抵达前至少 7 天取消，尾款可退还 80%。抵达前 24 小时内取消不予退款。",
  },
  {
    no: "12.6",
    en: "Payment Page Detail (E-sign consent): I agree that my electronic signature is legally binding and represents my consent to the deposit terms.",
    zh: "支付页细则（电子签名同意）：我同意我的电子签名具有法律效力，并代表我同意订金条款。",
  },
  {
    no: "12.7",
    en: "Payment Page Detail (KYC and privacy consent): I authorize the collection of passport information solely for appointment registration and verification. Data is encrypted and stored only as long as necessary for the service.",
    zh: "支付页细则（KYC 与隐私同意）：我授权仅为预约登记与核验收集护照信息。数据加密并仅在提供服务所必需的期限内存储。",
  },
  {
    no: "12.8",
    en: "Payment Page Detail (Facilitator disclaimer): We act solely as a facilitator and booking agent. We do not provide medical advice, diagnosis, or treatment. All medical services are provided by licensed third-party hospitals.",
    zh: "支付页细则（协助方免责声明）：我们仅作为协助方与预约代理，不提供医疗建议、诊断或治疗。所有医疗服务由持牌第三方医院提供。",
  },
];

function cellParagraphs(text) {
  const parts = text.split("\n");
  return parts.map((line) =>
    new Paragraph({
      children: [new TextRun(line)],
    })
  );
}

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = {
  top: tableBorder,
  bottom: tableBorder,
  left: tableBorder,
  right: tableBorder,
};

const headerRow = new TableRow({
  tableHeader: true,
  children: [
    new TableCell({
      width: { size: 1200, type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: "E6EEF3", type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Clause", bold: true })],
        }),
      ],
    }),
    new TableCell({
      width: { size: 4080, type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: "E6EEF3", type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "English", bold: true })],
        }),
      ],
    }),
    new TableCell({
      width: { size: 4080, type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: "E6EEF3", type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "中文", bold: true })],
        }),
      ],
    }),
  ],
});

const clauseRows = clauses.map((clause) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 1200, type: WidthType.DXA },
        borders: cellBorders,
        verticalAlign: VerticalAlign.TOP,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: clause.no, bold: true })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 4080, type: WidthType.DXA },
        borders: cellBorders,
        verticalAlign: VerticalAlign.TOP,
        children: cellParagraphs(clause.en),
      }),
      new TableCell({
        width: { size: 4080, type: WidthType.DXA },
        borders: cellBorders,
        verticalAlign: VerticalAlign.TOP,
        children: cellParagraphs(clause.zh),
      }),
    ],
  })
);

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "english-bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 },
              },
            },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 24 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [new TextRun("Terms & Conditions (Bilingual)")],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun(`Last updated: ${lastUpdated}`)],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun(`最后更新：${lastUpdated}`)],
        }),
        new Paragraph({
          spacing: { before: 240, after: 240 },
          children: [
            new TextRun(
              "Source: new-cmt /terms page and payment page agreement text (UI)."
            ),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun("来源：new-cmt 的 /terms 页面与支付页协议文案。")],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Original English Terms")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "These terms govern your use of ChinaMedicalTour.org and related services. By using the site, you agree to these terms."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Services Overview")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "We provide medical travel coordination, information, and concierge support in Beijing and Chengdu. We do not provide medical diagnosis or treatment services."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Medical Disclaimer")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "Content on this site is for informational purposes only. It is not medical advice and should not replace professional medical consultation."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Visa & Travel Disclaimer")],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "We do not issue invitation letters or handle visa applications."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "Visa approvals and travel permissions are the responsibility of the traveler and relevant authorities."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Availability")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "We do not guarantee 24/7 support availability. Response times may vary by channel and time zone."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("User Responsibilities")],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [new TextRun("Provide accurate and complete information.")],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [new TextRun("Comply with local laws and travel requirements.")],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [new TextRun("Respect privacy and safety rules of partner hospitals.")],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Payments")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "Payment methods and fees are described on our How to Pay page. Payment processors handle transactions securely."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Payment Agreements")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "By making a payment, you acknowledge and accept the following conditions."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "Deposit payments are accepted via PayPal, Alipay, and WeChat Pay. Balance payments are completed on-site via Alipay, WeChat Pay, or card present."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "Digital services are delivered immediately after payment. Once access is granted or content is downloaded, the service is non-refundable."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "Deposits reserve medical resources and appointment slots and are non-refundable once the appointment is confirmed."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "For cancellations made at least 7 days prior to arrival, the balance payment is eligible for an 80% refund. No refund is available for cancellations within 24 hours of arrival."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "You authorize us to collect passport information solely for appointment registration and verification. Data is encrypted and retained only as long as necessary for the service."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "We act solely as a facilitator and booking agent. All medical services are provided by licensed third-party hospitals."
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "english-bullets", level: 0 },
          children: [
            new TextRun(
              "If a deposit agreement requires electronic signature, you agree that your e-signature is legally binding."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Limitation of Liability")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "We are not liable for decisions by medical providers, travel authorities, or any outcomes related to visas, travel delays, or medical services provided by third parties."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Changes to Terms")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "We may update these terms from time to time. Continued use of the site indicates acceptance of the updated terms."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Governing Law")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "These terms are governed by the laws of the People’s Republic of China, without regard to conflict-of-law rules."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Questions?")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "Contact us via the contact page for any questions about these terms."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Payment Page Agreements")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "I agree to the Terms and Conditions and Privacy Policy."
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "I understand this includes immediate digital services, and I waive any cooling-off period once content is accessed or downloaded."
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "I understand deposits can be paid via PayPal, Alipay, or WeChat Pay, while balance payments are completed on-site by Alipay, WeChat Pay, or card present."
            ),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Payment Page Detail")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "Digital service clause: This purchase provides digital membership access and materials. Access is granted immediately after payment. The service is non-refundable once access is granted or content is downloaded."
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "Deposit clause: The deposit reserves medical resources and appointment slots. The deposit is non-refundable once the appointment is confirmed. For cancellations made at least 7 days prior to arrival, the balance payment is eligible for an 80% refund. No refund is available for cancellations within 24 hours of arrival."
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "E-sign consent: I agree that my electronic signature is legally binding and represents my consent to the deposit terms."
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "KYC and privacy consent: I authorize the collection of passport information solely for appointment registration and verification. Data is encrypted and stored only as long as necessary for the service."
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "Facilitator disclaimer: We act solely as a facilitator and booking agent. We do not provide medical advice, diagnosis, or treatment. All medical services are provided by licensed third-party hospitals."
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 240, after: 120 },
          children: [new TextRun("Bilingual Terms (English / 中文)")],
        }),
        new Table({
          columnWidths: [1200, 4080, 4080],
          rows: [headerRow, ...clauseRows],
        }),
      ],
    },
  ],
});

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.log(`Wrote ${OUTPUT_FILE}`);
});

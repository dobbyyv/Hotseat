// Legal documents for Hotseat (hotseat.site).
// Drafted to reflect the actual data processing verified in the codebase:
//   - PostgreSQL tables (users, groups, group_members, answers, answers_archive,
//     daily_chat, suggested_questions, push_subscriptions)
//   - /uploads disk storage (profile pictures + chat images)
//   - cron/dailyDrop.js retention (daily purge of live answers, chat, chat images)
//   - Cloudflare Tunnel, web-push, Google Fonts, and the optional GIPHY integration

export const EFFECTIVE_DATE = '17 August 2026';

export const CONTROLLER_NAME = 'Karam';
export const CONTROLLER_LOCATION = 'Italy';
export const CONTROLLER_CONTACT = 'hotseat.support@gmail.com';

export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  effective: EFFECTIVE_DATE,
  sections: [
    {
      h: '1. Who we are (Data Controller)',
      p: [
        'Hotseat ("the Service", "we", "us", "our") is operated by Karam, an individual developer based in Italy, who acts as the Data Controller under Regulation (EU) 2016/679 ("GDPR").',
        'You can contact the Controller by email at hotseat.support@gmail.com. This is the contact method for privacy requests and for exercising the rights described in Section 8.',
      ],
    },
    {
      h: '2. Data we collect and why',
      p: [
        'We collect only the minimum data needed to run a private daily-question game for small friend groups. We do not collect your email address, we do not verify your real identity, we do not build advertising profiles, and we do not use cross-site tracking cookies.',
      ],
      ul: [
        'Display name (and the initials derived from it) — to identify you to the other members of the group(s) you join.',
        'Profile picture (optional, an image you upload) — to display your avatar to your group.',
        'Group membership and streak counters — to run the daily question game and scorekeeping.',
        'Your daily answers — the core of the game; after you answer, your answer becomes visible to the other members of that group.',
        'Live chat messages, images and GIFs — to provide the real-time group chat.',
        'Suggested questions (optional) — to help us pick future daily questions.',
        'Recovery password (optional, stored only as a bcrypt hash) — to let you recover your account from another device.',
        'Push-notification subscription (optional) — to send you the daily question and group activity alerts. This includes a browser-assigned push endpoint and encryption keys.',
        'IP address — processed transiently, in server memory only, to enforce rate limits and protect the Service from abuse. It is never written to our database or to our access logs.',
      ],
    },
    {
      h: '3. Legal bases for processing',
      ul: [
        'Performance of the service you request (Art. 6(1)(b) GDPR): display name, group membership, streak counters, daily answers and live chat are necessary to run the game you join.',
        'Consent (Art. 6(1)(a) GDPR): profile picture, push notifications, suggested questions and the recovery password are all optional features that you actively enable. You can withdraw consent at any time.',
        'Legitimate interest (Art. 6(1)(f) GDPR): IP-based rate limiting and security measures to protect the Service and its users from abuse and attack. You may object to this processing.',
      ],
    },
    {
      h: '4. Data retention',
      ul: [
        'Live answers: deleted automatically every day at 09:00 Europe/Rome time and copied into the answer archive.',
        'Live chat messages and chat images: deleted automatically every day at 09:00 Europe/Rome time (they are not archived).',
        'Answer archive (your historical answers together with your display name): retained indefinitely to power the group history / calendar feature. You may request erasure at any time.',
        'Account data (display name, avatar, group membership, streaks, recovery password): retained for as long as your account exists. You may request deletion at any time.',
        'Profile pictures: stored on our server and retained until you request deletion.',
        'Suggested questions: retained until they are reviewed or removed.',
        'Push subscriptions: retained until you disable notifications or until your browser reports the subscription as expired.',
      ],
    },
    {
      h: '5. Third parties who receive data',
      ul: [
        'Cloudflare, Inc. (USA) — operates the reverse proxy / tunnel that serves hotseat.site. As part of delivering traffic, Cloudflare processes network-level data, including IP addresses, on our behalf as a processor.',
        'Browser push services (e.g. Google FCM, Mozilla autopush, Apple APNs, Microsoft WNS) — if you enable push notifications, your subscription and the notification payloads (such as the daily question) are delivered through your browser vendor\u2019s push service.',
        'Google Fonts (Google LLC, USA) — the site loads fonts from fonts.googleapis.com and fonts.gstatic.com; your IP address is transmitted to Google when those fonts load.',
        'GIPHY (Giphy, Inc., USA) — only if the optional GIF search is enabled. When you search for a GIF, your search term is sent to GIPHY and GIF images load from GIPHY\u2019s CDN.',
      ],
    },
    {
      h: '6. International transfers',
      p: [
        'Some of the processors listed above are based in the United States. Where personal data is transferred outside the European Economic Area, we rely on the safeguards required by the GDPR, including Standard Contractual Clauses, the EU-US Data Privacy Framework (DPF) adequacy decision (where the recipient is DPF-certified), and processor guarantees. The only data transferred in this way is network-level data (IP address) to Cloudflare and Google Fonts, and push-notification data to your browser\u2019s push service if you enable notifications.',
      ],
    },
    {
      h: '7. Security',
      p: [
        'We apply technical measures including TLS encryption (via Cloudflare), bcrypt hashing for recovery passwords, rate limiting, server-side validation of uploaded image content, and protection against SSRF and other abuse. The Service is a personal project and is provided "as is"; see the Terms of Service.',
      ],
    },
    {
      h: '8. Your rights',
      p: [
        'Under the GDPR you have the right to access, rectify, erase, restrict and object to processing of your personal data, the right to data portability, and the right to withdraw consent at any time (without affecting the lawfulness of processing before withdrawal).',
        'To exercise any of these rights, contact the Controller by email at hotseat.support@gmail.com. We will respond without undue delay and within one month.',
        'You also have the right to lodge a complaint with a supervisory authority. As the Controller is based in Italy, the competent authority is the Garante per la protezione dei dati personali (www.garanteprivacy.it).',
      ],
    },
    {
      h: '9. Children',
      p: [
        'Under the Italian Privacy Code (Legislative Decree 101/2018), the age of digital consent in Italy is 14. The Service is not directed at children under 14. If you are under 14, please do not use the Service unless you have the consent of a parent or guardian.',
      ],
    },
    {
      h: '10. Changes to this policy',
      p: [
        'We may update this Privacy Policy from time to time. The "Effective date" at the top will always reflect the latest version. Material changes will be highlighted on the site.',
      ],
    },
  ],
};
export const TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  effective: EFFECTIVE_DATE,
  sections: [
    {
      h: '1. Acceptance of these terms',
      p: [
        'By accessing hotseat.site ("the Service") and creating or joining a group, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.',
      ],
    },
    {
      h: '2. What the Service is',
      p: [
        'Hotseat is a personal portfolio project operated by Karam, an individual developer. It is a real-time daily-question game for friend groups. It is not a commercial product, and it is not offered with any service-level agreement.',
      ],
    },
    {
      h: '3. "AS IS" — no warranties, no guarantees',
      p: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.',
        'We do not guarantee uptime, availability, or data persistence. The Service may be offline, modified, or discontinued at any time, with or without notice. We are not liable for any loss of data, loss of access, or any other loss arising from your use of the Service.',
      ],
    },
    {
      h: '4. Accounts',
      p: [
        'You join the Service with a display name of your choosing. We do not verify identities. Optionally, you may set a recovery password to restore your account from another device; you are responsible for keeping that password safe.',
        'You are responsible for all activity associated with your account.',
      ],
    },
    {
      h: '5. Acceptable use',
      p: [
        'You agree not to use the Service to:',
      ],
      ul: [
        'upload, post, or transmit any content that is unlawful, defamatory, harassing, hateful, obscene, or otherwise harmful to others;',
        'upload, post, or transmit any content that infringes the intellectual property or privacy rights of any third party;',
        'upload malicious code or attempt to disrupt, probe, scrape, or gain unauthorized access to the Service or its infrastructure;',
        'impersonate others, spam, or otherwise abuse other users;',
        'use the Service in any way that violates applicable law.',
      ],
      p2: [
        'We reserve the right to remove content and to suspend or remove accounts that violate these rules.',
      ],
    },
    {
      h: '6. User content',
      p: [
        'You retain ownership of the content you submit (answers, chat messages, images, suggestions). By submitting content, you grant us a limited, non-exclusive license to store and display it within the groups you participate in, solely for the purpose of operating the Service.',
        'You are solely responsible for the legality of the content you submit.',
      ],
    },
    {
      h: '7. Limitation of liability',
      p: [
        'To the maximum extent permitted by law, Karam shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, goodwill, or use, arising out of or in connection with your use of the Service, even if advised of the possibility of such damages.',
      ],
    },
    {
      h: '8. Governing law',
      p: [
        'These Terms are governed by the laws of Italy, without regard to its conflict-of-law provisions. Any dispute shall be subject to the exclusive jurisdiction of the courts of Italy.',
      ],
    },
    {
      h: '9. Changes to these terms',
      p: [
        'We may revise these Terms at any time. The "Effective date" at the top will reflect the latest version. Continued use of the Service after changes constitutes acceptance of the revised Terms.',
      ],
    },
    {
      h: '10. Contact',
      p: [
        'Questions about these Terms can be directed to hotseat.support@gmail.com.',
      ],
    },
  ],
};





import './styles.css'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) throw new Error('App root not found')

app.innerHTML = `
      <main class="shell">
        <header class="commandbar"><div><span class="eyebrow">SCIENCE BY HUGs</span><strong>CORE</strong></div><span class="status">SYSTEM READY</span></header>
        <section class="hero">
          <h1>CORE</h1>
          <p class="tagline">Control. Operate. Manage.</p>
          <p class="copy">The internal command center for customers, orders, invoices, delivery operations, catalog controls, referrals, and messaging.</p>
        </section>
        <section class="grid">
          <article><span>OPS</span><h2>Orders</h2><p>Monitor and manage operational flow.</p></article>
          <article><span>CRM</span><h2>Customers</h2><p>Accounts, memberships, and service history.</p></article>
          <article><span>DATA</span><h2>Reporting</h2><p>Business performance and sync visibility.</p></article>
        </section>
      </main>`

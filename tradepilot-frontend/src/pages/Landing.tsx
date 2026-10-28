import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Brand } from '../components/WorkspaceUI';
export default function Landing() {
    return <main className="landing">
    <nav className="landing-nav" aria-label="Public navigation">
    <Brand />
    <div>
    <a href="#the-journal">The journal</a>
    <Link to="/login">Log in</Link>
    <Link className="landing-action" to="/register">Start your journal <ArrowUpRight size={15}/>
    </Link>
    </div>
    </nav>
    <section className="landing-hero">
    <h1>Your trading, in focus.</h1>
    <div className="landing-intro">
    <p>Bring your trading decisions into focus. Plan the trade, record the outcome, and understand the difference.</p>
    <Link className="landing-action" to="/register">Make your next trade count <ArrowRight size={16}/>
    </Link>
    </div>
    <figure className="landing-workspace" data-ui>
    <img src="/workspace-preview.png" alt="TradePilot's dark trading journal dashboard with independent planned, legacy and actual result sections"/>
    <figcaption>TradePilot workspace · illustrative synthetic journal data, not a performance claim</figcaption>
    </figure>
    </section>
    <section id="the-journal" className="landing-story">
    <h2>Keep the whole story.</h2>
    <div className="landing-story-rows">
    <article>
    <h3>The decision.</h3>
    <p>Keep your entry, stop, target, notes and chart together. Your planned risk-to-reward stays a plan.</p>
    </article>
    <article>
    <h3>The evidence.</h3>
    <p>Record actual results, partial exits and costs when supported by your environment. Unknown information stays unknown.</p>
    </article>
    <article>
    <h3>The perspective.</h3>
    <p>Review your journal calendar and account-scoped analytics. See legacy scores and actual realized results under their own names.</p>
    </article>
    </div>
    </section>
    <section className="landing-close">
    <h2>A clearer journal.<br />A deliberate trader.</h2>
    <Link className="landing-action" to="/register">Create your TradePilot account <ArrowUpRight size={17}/>
    </Link>
    <p>Manual journaling. No automatic broker connection or trade execution. Financial editing is enabled only in supported development/test environments.</p>
    </section>
    <footer className="landing-footer">
    <Brand />
    <span>Your process. Your progress.</span>
    <Link to="/login">Already a member? Log in ↗</Link>
    </footer>
    </main>;
}

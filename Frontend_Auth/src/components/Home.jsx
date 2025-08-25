import "./Home.css";

export default function Home({ onGetStarted }) {
  return (
    <section className="home">
      {/* Spline Background */}
      <div className="vdo">
        <spline-viewer
          url="https://prod.spline.design/KgnTcbOvLibFDhGg/scene.splinecode"
          class="spline-bg"
        ></spline-viewer>
      </div>

      {/* Hero Content */}
      <div className="home-content">
        <h1>
          Roboco <br />
          <span className="highlight-text">LLM Based Data Analyst Assistant</span>
        </h1>
        <p>
          Built by Team Rocket <br />
          Turning Questions into Insights-Instantly!
        </p>
        <button className="gradient-btn" onClick={onGetStarted}>
          Get Started
        </button>
      </div>
    </section>
  );
}
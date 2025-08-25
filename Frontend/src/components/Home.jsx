import "./Home.css";

export default function Home() {
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
          MIT Kurukshetra <br />
          <span className="highlight-text">AI Hackathon 🚀</span>
        </h1>
        <p>
          Build. Innovate. Compete. <br />
          Shape the future of Artificial Intelligence.
        </p>
        <button className="gradient-btn">Get Started</button>
      </div>
    </section>
  );
}

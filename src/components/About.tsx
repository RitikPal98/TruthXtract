
const About = () => {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 glow-text">
            About TruthSphere
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Empowering people with truth in the digital age
          </p>
        </div>
        
        <div className="glass-panel p-8">
          <p className="text-gray-300 mb-6">
            TruthSphere was born from a hackathon project aimed at addressing the growing crisis of misinformation in our digital ecosystem. Our team of data scientists, developers, and journalists came together with a shared mission: to create a tool that helps people navigate the complex information landscape with confidence.
          </p>
          
          <p className="text-gray-300 mb-6">
            In an era where information spreads at unprecedented speeds, the ability to discern fact from fiction has become a crucial skill. TruthSphere leverages cutting-edge AI technology to provide that discernment automatically, enabling users to make more informed decisions about the content they consume and share.
          </p>
          
          <p className="text-gray-300">
            Our commitment goes beyond just building technology. We're dedicated to promoting digital literacy and critical thinking skills, collaborating with educational institutions and media organizations to create a more informed public.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;

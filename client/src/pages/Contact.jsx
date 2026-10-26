import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, Phone, MapPin, Sparkles, BookOpen } from 'lucide-react';

export const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 600);
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Mail size={26} color="var(--primary)" /> Contact & Technical Support
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          Have feedback or technical questions about Practical 8 Performance Optimization? Send us a message below.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Contact Form */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--primary)" /> Send a Message
          </h2>

          {submitted ? (
            <div style={{ padding: '24px', textAlign: 'center', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#065f46' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Message Sent Successfully!</h3>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>Thank you for reaching out. We will get back to you shortly.</p>
              <button onClick={() => setSubmitted(false)} className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@charusat.edu.in"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Practical 8 Performance Benchmark Query"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Message
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Your message, feedback, or test report details..."
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : <><Send size={15} /> Submit Message</>}
              </button>
            </form>
          )}
        </div>

        {/* Info & Practical 8 Reference Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #f8fafc, #edf2f7)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--primary)" /> Code Splitting in Action
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
              This <strong>Contact page</strong> was dynamically fetched as a standalone JavaScript chunk (e.g. <code>Contact-*.js</code>) only when you navigated to <code>/contact</code>, saving initial bandwidth on the home page!
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--primary)" /> Lab Practical 8 Details
            </h3>
            <ul style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8', paddingLeft: '18px' }}>
              <li><strong>Course:</strong> Advanced Web Development Framework (AWDF)</li>
              <li><strong>Topic:</strong> React.lazy(), Suspense & Route Code Splitting</li>
              <li><strong>Roles:</strong> Admin, Manager, Employee</li>
              <li><strong>Features:</strong> Session Management, Forgot Password, Forward Workflow</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

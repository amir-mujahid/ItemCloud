// src/pages/AboutPage.jsx
import { useI18n } from '../i18n';
import {
  SparklesIcon,
  HeartIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UsersIcon,
  MapPinIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckCircleIcon,
  CubeIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

function FeatureCard({ icon, title, description }) {
  return (
    <div className="glass-solid rounded-xl p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="glass-solid rounded-xl p-6 text-center hover:shadow-xl hover:scale-105 transition-all duration-300">
      <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg mb-3`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
    </div>
  );
}

function TeamMember({ name, role, avatar }) {
  return (
    <div className="glass-solid rounded-xl p-6 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group">
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg group-hover:scale-110 transition-transform">
        {avatar || name.charAt(0).toUpperCase()}
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{name}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{role}</p>
    </div>
  );
}

function TimelineItem({ year, title, description, isLast }) {
  return (
    <div className="relative pl-8 pb-8">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-600" />
      )}
      
      {/* Timeline dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>
      
      {/* Content */}
      <div className="glass-solid rounded-xl p-4 hover:shadow-xl transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            {year}
          </span>
          <h4 className="font-bold text-slate-900 dark:text-white">{title}</h4>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const { t } = useI18n();

  const features = [
    {
      icon: <BoltIcon className="w-6 h-6 text-white" />,
      title: 'Fast & Efficient',
      description: 'Quick item registration and claiming process with real-time notifications.',
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-white" />,
      title: 'Secure System',
      description: 'End-to-end encryption and secure authentication to protect your data.',
    },
    {
      icon: <CubeIcon className="w-6 h-6 text-white" />,
      title: 'Smart Storage',
      description: 'Automated box management with ESP32-CAM for visual verification.',
    },
    {
      icon: <UsersIcon className="w-6 h-6 text-white" />,
      title: 'User-Friendly',
      description: 'Intuitive interface designed for students and staff alike.',
    },
  ];

  const timeline = [
    {
      year: '2025',
      title: 'Project Launch',
      description: 'ItemCloud officially launched at Kolej Matrikulasi Johor, revolutionizing lost and found management.',
    },
    {
      year: '2025',
      title: 'Development Phase',
      description: 'Built with modern technologies: React, Firebase, Tailwind CSS, and ESP32-CAM integration.',
    },
    {
      year: '2025',
      title: 'Concept & Design',
      description: 'Initial research and planning to create an automated lost and found system.',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Section */}
      <div className="glass-gradient rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
              <img src="/logo.png" alt="ItemCloud" className="w-16 h-16 rounded-xl" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              {t('about.title', 'About ItemCloud')}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              {t('tagline', 'Smart Lost & Found System for Modern Campuses')}
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
                🚀 Fast
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                🔒 Secure
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium">
                🎯 Efficient
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircleIcon className="w-7 h-7 text-white" />}
          label="Items Managed"
          value="500+"
          color="blue"
        />
        <StatCard
          icon={<UsersIcon className="w-7 h-7 text-white" />}
          label="Active Users"
          value="200+"
          color="green"
        />
        <StatCard
          icon={<ClockIcon className="w-7 h-7 text-white" />}
          label="Avg Response Time"
          value="<5min"
          color="purple"
        />
        <StatCard
          icon={<HeartIcon className="w-7 h-7 text-white" />}
          label="Success Rate"
          value="95%"
          color="amber"
        />
      </div>

      {/* Mission Section */}
      <div className="glass-solid rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <LightBulbIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('about.mission', 'Our Mission')}
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
          {t('about.missionDesc', 'ItemCloud aims to revolutionize the lost and found experience by providing a seamless, automated system that connects lost items with their rightful owners quickly and securely. We leverage cutting-edge technology to make campus life easier and more efficient.')}
        </p>
      </div>

      {/* Features Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Key Features
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>

      {/* Timeline Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Our Journey
          </h2>
        </div>
        <div className="glass-solid rounded-2xl p-6">
          {timeline.map((item, index) => (
            <TimelineItem
              key={index}
              {...item}
              isLast={index === timeline.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Technology Stack */}
      <div className="glass-solid rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <CubeIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Built With Modern Technology
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['React', 'Firebase', 'Tailwind CSS', 'ESP32-CAM', 'Vite', 'Node.js', 'Firestore', 'EmailJS'].map((tech, index) => (
            <div
              key={index}
              className="px-4 py-3 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-center font-semibold text-slate-900 dark:text-white hover:shadow-lg transition-shadow"
            >
              {tech}
            </div>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
            <UsersIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Meet the Team
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TeamMember name="Development Team" role="Full Stack Development" />
          <TeamMember name="HEP Team" role="Student Affairs Support" />
          <TeamMember name="KMJ Community" role="Testing & Feedback" />
        </div>
      </div>

      {/* Contact Section */}
      <div className="glass-gradient rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <EnvelopeIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('about.contact', 'Get in Touch')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <EnvelopeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white mb-1">Email</div>
              <a
                href="mailto:info.itemcloud@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                info.itemcloud@gmail.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <MapPinIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white mb-1">Location</div>
              <p className="text-slate-600 dark:text-slate-400">
                Kolej Matrikulasi Johor, Malaysia
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <GlobeAltIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white mb-1">Website</div>
              <a
                href="https://itemcloud-9a47f.web.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                itemcloud.web.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white mb-1">Support Hours</div>
              <p className="text-slate-600 dark:text-slate-400">
                24/7 System Access<br />
                Mon-Fri, 9AM-5PM Office Support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 p-6">
        <HeartIcon className="w-5 h-5 inline text-red-500 mb-1" />
        {' '}Made with passion for the KMJ community
        <br />
        <span className="text-xs">© {new Date().getFullYear()} ItemCloud. All rights reserved.</span>
      </div>
    </div>
  );
}
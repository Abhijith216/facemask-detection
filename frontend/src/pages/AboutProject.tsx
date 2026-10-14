import React from 'react';
import {
  BookOpen, Target, Layers, Database, Globe, AlertCircle, Rocket,
} from 'lucide-react';

const SECTION_CLASS = 'bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3';
const H3_CLASS = 'font-bold text-slate-800 dark:text-white flex items-center gap-2';
const P_CLASS = 'text-sm text-slate-600 dark:text-slate-400 leading-relaxed';

export const AboutProject: React.FC = () => (
  <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
    <div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">About Project</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
        Face Mask Detection System Using CNN and MobileNetV2
      </p>
    </div>

    {/* Disclaimer */}
    <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-700 dark:text-amber-300">
        <strong>Educational Prototype — Not a Medical Device.</strong> This system is designed as
        a college mini-project to demonstrate computer-vision concepts. It is not a certified
        medical diagnostic tool and must not be used to enforce mask compliance or make health decisions.
      </p>
    </div>

    {/* Abstract */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><BookOpen className="w-5 h-5 text-blue-500" /> Project Abstract</h3>
      <p className={P_CLASS}>
        This project implements an AI-powered computer-vision system that automatically identifies
        whether individuals in images or video frames are wearing face masks correctly, not wearing
        masks, or wearing them incorrectly. Built with MobileNetV2 transfer learning on top of a
        CNN architecture, the system achieves efficient, accurate classification suitable for
        real-time inference on standard hardware.
      </p>
    </div>

    {/* Problem Statement */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><AlertCircle className="w-5 h-5 text-red-500" /> Problem Statement</h3>
      <p className={P_CLASS}>
        Manual monitoring of mask compliance in public spaces is impractical at scale. Computer
        vision offers a non-invasive, automated approach to identify compliance patterns and provide
        awareness feedback. This project explores whether a lightweight deep-learning model can
        reliably classify mask usage from standard webcam and image inputs.
      </p>
    </div>

    {/* Objectives */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Target className="w-5 h-5 text-green-500" /> Objectives</h3>
      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-none">
        {[
          'Develop an accurate face-mask classifier using MobileNetV2 with transfer learning.',
          'Integrate an OpenCV face detector to locate faces before classification.',
          'Provide real-time webcam detection with live bounding-box overlays.',
          'Support image upload for offline batch analysis.',
          'Persist detection history and surface aggregate statistics.',
          'Expose a clean REST API backend with proper validation and error handling.',
          'Build a professional, responsive React dashboard for easy use.',
        ].map((obj, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            {obj}
          </li>
        ))}
      </ul>
    </div>

    {/* System Architecture */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Layers className="w-5 h-5 text-purple-500" /> System Architecture</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {[
          {
            title: 'Frontend (React)',
            items: ['Vite + TypeScript', 'Tailwind CSS', 'Recharts analytics', 'Webcam via MediaDevices API', 'Drag-and-drop upload'],
          },
          {
            title: 'Backend (Flask)',
            items: ['REST API endpoints', 'CORS-enabled', 'OpenCV face detector', 'TensorFlow/Keras inference', 'SQLite history DB'],
          },
          {
            title: 'AI/ML Pipeline',
            items: ['MobileNetV2 (ImageNet weights)', 'CNN classification head', 'Two-phase training', 'Data augmentation', 'Metrics export'],
          },
        ].map(({ title, items }) => (
          <div key={title} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{title}</h4>
            <ul className="space-y-1">
              {items.map(item => (
                <li key={item} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>

    {/* Methodology */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Rocket className="w-5 h-5 text-teal-500" /> Methodology</h3>
      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-200">Inference pipeline:</p>
        <ol className="list-none space-y-1.5">
          {[
            'Input image / webcam frame is received by the backend.',
            'OpenCV Haar Cascade detects face bounding boxes.',
            'Each face crop is resized to 224 × 224 and MobileNetV2-preprocessed (scale to [−1, 1]).',
            'The trained classifier outputs a softmax probability vector.',
            'The highest-probability class and confidence are returned.',
            'Bounding boxes and labels are drawn on the image and returned to the frontend.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>

    {/* Concepts */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Layers className="w-5 h-5 text-blue-500" /> Concepts Used</h3>
      <div className="flex flex-wrap gap-2">
        {[
          'Convolutional Neural Networks',
          'Transfer Learning',
          'MobileNetV2',
          'Image Preprocessing',
          'OpenCV Face Detection',
          'Deep Learning Classification',
          'Data Augmentation',
          'Model Fine-tuning',
          'REST API Design',
          'React Hooks',
          'SQLite Persistence',
        ].map(tag => (
          <span key={tag} className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
            {tag}
          </span>
        ))}
      </div>
    </div>

    {/* Dataset */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Database className="w-5 h-5 text-orange-500" /> Dataset</h3>
      <p className={P_CLASS}>
        This project uses the{' '}
        <a
          href="https://www.kaggle.com/datasets/omkargurav/face-mask-dataset"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 dark:text-blue-400 underline"
        >
          Face Mask Detection Dataset
        </a>{' '}
        by Omkar Gurav on Kaggle. The dataset contains two classes:{' '}
        <strong>with_mask</strong> and <strong>without_mask</strong> face images.
        A three-class dataset including <strong>mask_weared_incorrect</strong> can be configured
        via <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">config.py</code>.
      </p>
    </div>

    {/* Social relevance */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Globe className="w-5 h-5 text-green-500" /> Social Relevance</h3>
      <p className={P_CLASS}>
        Face mask compliance monitoring became critical during the COVID-19 pandemic. This project
        demonstrates how computer vision can assist in voluntary mask-compliance awareness in campus
        and public environments. It illustrates the accessibility of deep learning tools for
        social-good applications even with limited computational resources.
      </p>
    </div>

    {/* Limitations */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><AlertCircle className="w-5 h-5 text-amber-500" /> Limitations</h3>
      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
        {[
          'Haar Cascade face detector may miss faces at extreme angles or in low light.',
          'Performance is dependent on dataset quality and size.',
          'The two-class dataset cannot distinguish between correctly and incorrectly worn masks without a three-class training set.',
          'Real-time performance depends on the host machine\'s CPU/GPU.',
          'Not validated for medical or law-enforcement use.',
        ].map((lim, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-2" />
            {lim}
          </li>
        ))}
      </ul>
    </div>

    {/* Future enhancements */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Rocket className="w-5 h-5 text-purple-500" /> Future Enhancements</h3>
      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
        {[
          'Integrate a DNN face detector (MTCNN / MediaPipe) for better accuracy at angles.',
          'Train on a three-class dataset for incorrect-mask classification.',
          'Add YOLO-based object detection for multi-person scenes.',
          'Export the model to TensorFlow Lite for edge-device deployment.',
          'Implement real-time alerting via WebSockets.',
          'Add video file analysis support.',
          'Deploy via Docker with Nginx reverse proxy.',
        ].map((enh, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-2" />
            {enh}
          </li>
        ))}
      </ul>
    </div>

    {/* Tech stack table */}
    <div className={SECTION_CLASS}>
      <h3 className={H3_CLASS}><Layers className="w-5 h-5 text-blue-500" /> Technology Stack</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Layer</th>
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Technology</th>
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-slate-600 dark:text-slate-400">
            {[
              ['Frontend', 'React + Vite + TypeScript', 'UI framework'],
              ['Styling', 'Tailwind CSS', 'Utility-first CSS'],
              ['Charts', 'Recharts', 'Analytics visualisation'],
              ['HTTP', 'Axios', 'API communication'],
              ['Backend', 'Flask', 'REST API server'],
              ['CORS', 'flask-cors', 'Cross-origin requests'],
              ['ML Framework', 'TensorFlow / Keras', 'Model training & inference'],
              ['Base Model', 'MobileNetV2', 'Transfer learning backbone'],
              ['Computer Vision', 'OpenCV', 'Face detection & image processing'],
              ['Database', 'SQLite', 'Detection history storage'],
              ['Data Science', 'NumPy, scikit-learn, Matplotlib', 'Numerics, evaluation, plotting'],
            ].map(([layer, tech, purpose]) => (
              <tr key={layer} className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-2 font-medium text-slate-700 dark:text-slate-300">{layer}</td>
                <td className="py-2 font-mono text-xs">{tech}</td>
                <td className="py-2">{purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

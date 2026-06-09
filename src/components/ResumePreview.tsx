/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from "react";
import { ResumeData, ResumeTemplate } from "../types";
import { Download, Printer, Award, BookOpen, Briefcase, Code, MapPin, Mail, Phone, Globe, Linkedin, CheckSquare } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface ResumePreviewProps {
  data: ResumeData;
  templateId: string;
  onDownloadStart?: () => void;
  onDownloadEnd?: () => void;
}

export default function ResumePreview({
  data,
  templateId,
  onDownloadStart,
  onDownloadEnd,
}: ResumePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    personalInfo = {
      name: "",
      email: "",
      phone: "",
      linkedin: "",
      portfolio: "",
      location: "",
      jobTitle: "",
      summary: "",
    },
    education = [],
    experience = [],
    projects = [],
    skills = { technical: [], soft: [] },
    certifications = [],
    achievements = [],
    languages = [],
    extracurriculars = [],
    volunteer = [],
    references = "",
  } = data;

  // Multi-page PDF download handler matching exact view
  const downloadPDFHandler = async () => {
    if (!containerRef.current) return;
    if (onDownloadStart) onDownloadStart();

    const element = containerRef.current;
    
    // Backup current layout values to restore them after capture
    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    const originalMaxWidth = element.style.maxWidth;
    const originalClassName = element.className;

    try {
      // Force uniform desktop width (800px matches standard desktop template design)
      // This prevents the PDF layout from collapsing to a single mobile column when printed inside a narrow iframe or on mobile browsers
      element.style.width = "800px";
      element.style.minWidth = "800px";
      element.style.maxWidth = "800px";
      
      // Let the browser reflow styles
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Render elements on the canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 800,
      windowHeight: element.scrollHeight,
      foreignObjectRendering: false,
    });

      const imgData = canvas.toDataURL("image/png");
      
      // Set A4 parameters (A4 is 210mm x 297mm)
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Draw first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Wrap other pages seamlessly
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = (personalInfo.name || "Resume").replace(/\s+/g, "_");
      pdf.save(`${safeName}_VoiceCV.pdf`);

      // Invoke server tracking endpoint to fulfill route spec
      try {
        await fetch("/api/resume/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId: "pdf-generated-client" }),
        });
      } catch (err) {
        console.warn("Fulfillment track API skip:", err);
      }
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      // Safely restore original view values for the viewer frame layout
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      element.style.maxWidth = originalMaxWidth;
      element.className = originalClassName;

      if (onDownloadEnd) onDownloadEnd();
    }
  };

  // Helper lists renderer for simple tags
  const renderList = (items: string[]) => {
    if (!items || items.length === 0) return null;
    return items.map((item, index) => (
      <span
        key={index}
        className="inline-block px-2.5 py-1 text-xs font-normal text-slate-700 bg-slate-100/80 rounded-md mr-1.5 mb-1.5 break-all border border-slate-200/50"
      >
        {item}
      </span>
    ));
  };

  // Modern Template Layout (Split Columns)
  const renderModernTemplate = () => {
    return (
      <div className="p-8 text-slate-800 bg-white min-h-[1050px] font-sans antialiased leading-relaxed flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="border-b border-indigo-100 pb-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{personalInfo.name || "Your Full Name"}</h1>
              <p className="text-lg font-medium text-indigo-600 mt-1">{personalInfo.jobTitle || "Desired Employment Job Title"}</p>
            </div>
            <div className="text-sm text-slate-600 space-y-1 md:text-right">
              {personalInfo.email && (
                <div className="flex items-center md:justify-end gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="break-all">{personalInfo.email}</span>
                </div>
              )}
              {personalInfo.phone && (
                <div className="flex items-center md:justify-end gap-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{personalInfo.phone}</span>
                </div>
              )}
              {personalInfo.location && (
                <div className="flex items-center md:justify-end gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{personalInfo.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Social and Portfolio links */}
          {(personalInfo.linkedin || personalInfo.portfolio) && (
            <div className="flex flex-wrap gap-4 text-xs font-normal text-indigo-600 mb-6 bg-indigo-50/50 px-4 py-2.5 rounded-lg border border-indigo-100/40">
              {personalInfo.linkedin && (
                <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline break-all">
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>{personalInfo.linkedin}</span>
                </a>
              )}
              {personalInfo.portfolio && (
                <a href={personalInfo.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline break-all">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{personalInfo.portfolio}</span>
                </a>
              )}
            </div>
          )}

          {/* Summary */}
          {personalInfo.summary && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold tracking-wider text-slate-900 uppercase mb-2">Professional Summary</h2>
              <p className="text-sm text-slate-600 leading-relaxed align-justify break-words whitespace-pre-line">{personalInfo.summary}</p>
            </div>
          )}

          {/* Grid body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Main col */}
            <div className="lg:col-span-8 space-y-6">
              {/* Experience */}
              {experience.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-3.5 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    Work Experience
                  </h3>
                  <div className="space-y-4">
                    {experience.map((exp, j) => (
                      <div key={j} className="break-inside-avoid">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-1">
                          <h4 className="text-sm font-semibold text-slate-900">{exp.position} at {exp.company}</h4>
                          <span className="text-xs font-normal text-slate-500 sm:text-right shrink-0">{exp.startDate} – {exp.endDate}</span>
                        </div>
                        {exp.location && <p className="text-xs text-indigo-600 font-medium mb-1">{exp.location}</p>}
                        <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-line">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {projects.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-3.5 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-500" />
                    Key Projects
                  </h3>
                  <div className="space-y-4">
                    {projects.map((proj, p) => (
                      <div key={p} className="break-inside-avoid border-l-2 border-indigo-100 pl-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-1">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {proj.name} {proj.role ? `(${proj.role})` : ""}
                          </h4>
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 hover:underline shrink-0 break-all">
                              View Project
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mb-1.5 break-words whitespace-pre-line">{proj.description}</p>
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {proj.technologies.map((t, idx) => (
                              <span key={idx} className="inline-block bg-indigo-50 text-[10px] text-indigo-700 px-1.5 py-0.5 rounded font-medium border border-indigo-100/30">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Volunteer */}
              {volunteer.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-3.5">Volunteer Work</h3>
                  <div className="space-y-3.5">
                    {volunteer.map((v, idx) => (
                      <div key={idx} className="break-inside-avoid">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="text-xs font-semibold text-slate-900">{v.role} – {v.organization}</h4>
                          <span className="text-[11px] text-slate-500 shrink-0">{v.startDate} – {v.endDate}</span>
                        </div>
                        <p className="text-xs text-slate-600 break-words whitespace-pre-line">{v.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar col */}
            <div className="lg:col-span-4 space-y-6">
              {/* Education */}
              {education.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Education
                  </h3>
                  <div className="space-y-3.5">
                    {education.map((edu, e) => (
                      <div key={e} className="break-inside-avoid">
                        <h4 className="text-xs font-bold text-slate-900">{edu.degree} in {edu.fieldOfStudy}</h4>
                        <p className="text-xs text-slate-700 font-medium mt-0.5">{edu.school}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{edu.startDate} – {edu.endDate}</p>
                        {edu.description && <p className="text-[11px] text-slate-600 mt-1 break-words whitespace-pre-line">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {((skills.technical && skills.technical.length > 0) || (skills.soft && skills.soft.length > 0)) && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-3 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-indigo-500" />
                    Skills
                  </h3>
                  <div className="space-y-3">
                    {skills.technical && skills.technical.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block mb-1.5">Technical & Tools</span>
                        <div className="flex flex-wrap">{renderList(skills.technical)}</div>
                      </div>
                    )}
                    {skills.soft && skills.soft.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block mb-1.5">Professional & Soft</span>
                        <div className="flex flex-wrap">{renderList(skills.soft)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {certifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-3">Certifications</h3>
                  <div className="space-y-2">
                    {certifications.map((c, idx) => (
                      <div key={idx} className="break-inside-avoid flex flex-col md:flex-row md:justify-between items-start gap-1">
                        <div>
                          <p className="text-xs font-semibold text-slate-800 leading-tight">{c.name}</p>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">{c.issuer} ({c.date})</span>
                        </div>
                        {c.link && (
                          <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-indigo-600 hover:underline block break-all">
                            Verify
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {languages.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-2.5">Languages</h3>
                  <div className="flex flex-wrap gap-1.5">{renderList(languages)}</div>
                </div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-2">Key Achievements</h3>
                  <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                    {achievements.map((item, index) => (
                      <li key={index} className="break-words leading-tight">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracurriculars */}
              {extracurriculars.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-2">Activities</h3>
                  <div className="flex flex-wrap gap-1.5">{renderList(extracurriculars)}</div>
                </div>
              )}
            </div>
          </div>

          {/* References */}
          {references && (
            <div className="border-t border-slate-200 mt-8 pt-4">
              <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase mb-1.5">References</h3>
              <p className="text-xs text-slate-600 italic break-words whitespace-pre-line">{references}</p>
            </div>
          )}
        </div>

        {/* Branding Footer */}
        <div className="text-[10px] text-slate-400 border-t border-slate-150 pt-3 mt-8 flex flex-row justify-between items-center bg-transparent">
          <span>Formatted and structured by VoiceCV AI</span>
          <span>ATS Verified</span>
        </div>
      </div>
    );
  };

  // Professional Template Layout (Centered ATS Alignment)
  const renderProfessionalTemplate = () => {
    return (
      <div className="p-10 text-slate-900 bg-white min-h-[1050px] font-serif antialiased leading-relaxed flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="text-center pb-6 mb-6 border-b-2 border-slate-800">
            <h1 className="text-3xl font-bold tracking-wide uppercase text-slate-950 font-serif">{personalInfo.name || "Your Full Name"}</h1>
            <p className="text-xs uppercase tracking-widest text-slate-700 italic font-medium mt-1.5">{personalInfo.jobTitle || "Desired Employment Job Title"}</p>
            
            <div className="mt-3 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-sans">
              {personalInfo.email && <span className="break-all">{personalInfo.email}</span>}
              {personalInfo.phone && <span>{personalInfo.phone}</span>}
              {personalInfo.location && <span>{personalInfo.location}</span>}
            </div>
            
            <div className="mt-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 font-sans">
              {personalInfo.linkedin && <span className="break-all">{personalInfo.linkedin}</span>}
              {personalInfo.portfolio && <span className="break-all">{personalInfo.portfolio}</span>}
            </div>
          </div>

          {/* Core Summary */}
          {personalInfo.summary && (
            <div className="mb-6">
              <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 mb-1.5">Professional Executive Summary</h2>
              <p className="text-xs text-slate-800 font-serif leading-relaxed text-justify break-words whitespace-pre-line">{personalInfo.summary}</p>
            </div>
          )}

          {/* Experience Section */}
          {experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-3 flex items-center">
                WORK EXPERIENCE
              </h2>
              <div className="space-y-4">
                {experience.map((exp, j) => (
                  <div key={j} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-xs font-bold text-slate-950">{exp.position} — {exp.company}</h3>
                      <span className="text-xs font-medium text-slate-600 shrink-0">{exp.startDate} – {exp.endDate}</span>
                    </div>
                    {exp.location && <p className="text-[10px] text-slate-500 font-medium italic mb-1">{exp.location}</p>}
                    <p className="text-xs text-slate-800 leading-relaxed break-words whitespace-pre-line">{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education Section */}
          {education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-3">
                EDUCATION
              </h2>
              <div className="space-y-3">
                {education.map((edu, e) => (
                  <div key={e} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-xs font-bold text-slate-950">{edu.degree} in {edu.fieldOfStudy}</h3>
                      <span className="text-xs font-medium text-slate-600 shrink-0">{edu.startDate} – {edu.endDate}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{edu.school}</p>
                    {edu.description && <p className="text-[11px] text-slate-600 mt-1 break-words whitespace-pre-line">{edu.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {projects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-3">
                NOTABLE PROJECTS
              </h2>
              <div className="space-y-3.5">
                {projects.map((proj, p) => (
                  <div key={p} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-xs font-bold text-slate-950">{proj.name} {proj.role ? `(Role: ${proj.role})` : ""}</h4>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-indigo-600 hover:underline shrink-0 break-all">
                          view link
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-800 break-words whitespace-pre-line">{proj.description}</p>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <p className="text-[10px] mt-1 text-slate-500 font-sans">
                        <strong>Technologies:</strong> {proj.technologies.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Grid */}
          {((skills.technical && skills.technical.length > 0) || (skills.soft && skills.soft.length > 0)) && (
            <div className="mb-6 mb-6">
              <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-2">
                SKILLS & EXPERTISE
              </h2>
              <div className="space-y-1.5 text-xs text-slate-800">
                {skills.technical && skills.technical.length > 0 && (
                  <p>
                    <strong>Technical Proficiencies:</strong> {skills.technical.join(", ")}
                  </p>
                )}
                {skills.soft && skills.soft.length > 0 && (
                  <p>
                    <strong>Core Strengths:</strong> {skills.soft.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Two Columns for Certs, Languages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
            {certifications.length > 0 && (
              <div>
                <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-2">
                  CERTIFICATIONS
                </h2>
                <ul className="list-disc list-inside text-xs text-slate-800 space-y-1">
                  {certifications.map((c, idx) => (
                    <li key={idx} className="break-words">
                      <strong>{c.name}</strong> – {c.issuer} ({c.date})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {languages.length > 0 && (
              <div>
                <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-2">
                  LANGUAGES
                </h2>
                <p className="text-xs text-slate-800 leading-normal">{languages.join(", ")}</p>
              </div>
            )}
          </div>

          {/* Achievements & Activities */}
          {(achievements.length > 0 || extracurriculars.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-4 pb-4">
              {achievements.length > 0 && (
                <div>
                  <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-2">
                    ACHIEVEMENTS
                  </h2>
                  <ul className="list-disc list-inside text-xs text-slate-850 space-y-1">
                    {achievements.map((item, index) => (
                      <li key={index} className="break-words leading-snug">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {extracurriculars.length > 0 && (
                <div>
                  <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 border-b border-slate-800 pb-0.5 mb-2">
                    VOLUNTEER & INVOLVEMENT
                  </h2>
                  <ul className="list-none text-xs text-slate-800 space-y-2">
                    {volunteer.map((v, idx) => (
                      <li key={idx} className="break-words">
                        <span className="font-bold">{v.role}</span> at {v.organization} ({v.startDate} - {v.endDate})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* References */}
          {references && (
            <div className="border-t border-slate-800 pt-4">
              <h2 className="text-xs uppercase font-bold tracking-widest text-slate-950 mb-1">REFERENCES</h2>
              <p className="text-xs text-slate-700 italic break-words whitespace-pre-line">{references}</p>
            </div>
          )}
        </div>

        {/* Branding Footer */}
        <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-3 mt-8 flex flex-row justify-between items-center bg-transparent font-sans">
          <span>Fitted to National Recruitment Template Standards</span>
          <span>100% compliant file</span>
        </div>
      </div>
    );
  };

  // Minimal Template Layout (Ultra clean with high negative space)
  const renderMinimalTemplate = () => {
    return (
      <div className="p-8 text-neutral-850 bg-white min-h-[1050px] font-sans antialiased text-[13px] leading-relaxed flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="pb-8 mb-6 border-b border-neutral-200">
            <h1 className="text-3xl font-light tracking-tight text-neutral-900">{personalInfo.name || "Your Full Name"}</h1>
            <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase mt-1">{personalInfo.jobTitle || "Desired Employment Job Title"}</p>
            
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-600 font-light">
              {personalInfo.email && <span className="break-all">{personalInfo.email}</span>}
              {personalInfo.phone && <span>{personalInfo.phone}</span>}
              {personalInfo.location && <span>{personalInfo.location}</span>}
              {personalInfo.linkedin && <span className="break-all">{personalInfo.linkedin}</span>}
              {personalInfo.portfolio && <span className="break-all">{personalInfo.portfolio}</span>}
            </div>
          </div>

          {/* Summary */}
          {personalInfo.summary && (
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">About Me</p>
              <p className="text-neutral-600 break-words whitespace-pre-line leading-relaxed text-justify">{personalInfo.summary}</p>
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Experience</p>
              <div className="space-y-6">
                {experience.map((exp, j) => (
                  <div key={j} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-neutral-900 text-sm">{exp.position}</h3>
                      <span className="text-xs text-neutral-500 shrink-0 font-light">{exp.startDate} – {exp.endDate}</span>
                    </div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">{exp.company} {exp.location ? `, ${exp.location}` : ""}</p>
                    <p className="text-neutral-600 break-words whitespace-pre-line">{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Education</p>
              <div className="space-y-4">
                {education.map((edu, e) => (
                  <div key={e} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-neutral-900">{edu.degree} in {edu.fieldOfStudy}</h3>
                      <span className="text-xs text-neutral-500 shrink-0 font-light">{edu.startDate} – {edu.endDate}</span>
                    </div>
                    <p className="text-xs text-neutral-500">{edu.school}</p>
                    {edu.description && <p className="text-neutral-600 mt-1 break-words whitespace-pre-line">{edu.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid section for side skills / certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            {/* Skills */}
            {((skills.technical && skills.technical.length > 0) || (skills.soft && skills.soft.length > 0)) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Skills</p>
                <div className="space-y-2">
                  {skills.technical && skills.technical.length > 0 && (
                    <p className="text-neutral-600">
                      <strong>Technical: </strong> {skills.technical.join(", ")}
                    </p>
                  )}
                  {skills.soft && skills.soft.length > 0 && (
                    <p className="text-neutral-600">
                      <strong>Soft: </strong> {skills.soft.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Credentials</p>
                <ul className="text-neutral-600 space-y-1 list-none">
                  {certifications.map((c, idx) => (
                    <li key={idx} className="break-words">
                      • <strong>{c.name}</strong> ({c.issuer}, {c.date})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Languages & Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 border-t border-neutral-150 pt-6">
            {languages.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Languages</p>
                <p className="text-neutral-600">{languages.join(", ")}</p>
              </div>
            )}

            {achievements.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Achievements</p>
                <ul className="text-neutral-600 space-y-1 list-disc list-inside">
                  {achievements.map((item, idx) => (
                    <li key={idx} className="break-words font-light">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Branding Footer */}
        <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-3 mt-8 flex flex-row justify-between items-center bg-transparent font-sans">
          <span>Elegant minimal format</span>
          <span>Clean ATS matching</span>
        </div>
      </div>
    );
  };

  // Helper template switcher
  const renderTemplateBody = () => {
    switch (templateId) {
      case ResumeTemplate.MINIMAL:
        return renderMinimalTemplate();
      case ResumeTemplate.PROFESSIONAL:
        return renderProfessionalTemplate();
      case ResumeTemplate.MODERN:
      default:
        return renderModernTemplate();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Control Actions bar */}
      <div className="flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-slate-200/60 shadow-sm">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          ATS Verified Template Preview
        </span>
        <button
          onClick={downloadPDFHandler}
          id="btn-download-pdf-preview"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg shadow transition-all duration-150 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Download ATS-Friendly PDF
        </button>
      </div>

      {/* Frame wrapper for standard print layout */}
      <div className="w-full overflow-x-auto bg-slate-100/50 p-2 sm:p-6 rounded-2xl border border-slate-200/60 shadow-inner flex justify-center">
        <div
          ref={containerRef}
          id="active-resume-printable-area"
          className="w-full max-w-[800px] bg-white shadow-xl rounded-sm border border-slate-200 mx-auto"
          style={{ width: "100%", minWidth: "320px" }}
        >
          {renderTemplateBody()}
        </div>
      </div>
    </div>
  );
}

import { supabase } from "./config/supabase.js";

import {
  signIn,
  signOut,
  verifyAdmin,
  subscribeToAuthChanges,
  restoreSession
} from "./services/authService.js";

import {
  getDiscussions,
  createDiscussion,
  createReply
} from "./services/discussionService.js";
import {
  getNotices,
  addNotice,
  updateNotice,
  deleteNotice as deleteNoticeFromDatabase,
  uploadNoticePoster
} from "./services/noticeService.js";

let notices = [

{id:"AAR-001",title:"Aarambh 6.0: Freshers Fest",category:"Fest",date:"To be announced",time:"To be announced",venue:"To be announced",deadline:"",link:"https://aarambh60googleformconnected-2.vercel.app",description:"Aarambh 6.0 is here and every student is invited to be part of it. Take part in activities, perform and showcase your talent, or join the Aarambh team and help organise the fest, on stage or behind the scenes. Aarambh 6.0: More Than a Fest. It’s a Feeling.",sourceFile:"Aarambh 6.0 announcement"},

{id:"AWS-001",title:"Builders Breakout: AWS Student Builder Hackathon",category:"Hackathon",date:"6 October 2026",time:"10:00 AM – 3:00 PM",venue:"Architecture Building, CSMU",deadline:"",link:"https://forms.gle/NQrFm58QkNZZWBAa8",description:"Second event by AWS Cloud Club × CSMU. Theme: Open Innovation. Solo, duo, trio or quad teams can join. Use at least one AWS tool or service, and make every GitHub commit on hackathon day. Eligible participants can receive AWS credits after registering with AWS. Presentations start at 2:00 PM sharp, three minutes per team.",sourceFile:"AWS Cloud Club announcement"},

{id:"CIR-001",title:"Multi-Agent Systems and How to Use Them",category:"Workshop",date:"14 October 2026",time:"12:30 PM IST",venue:"Online (Zoom)",deadline:"",link:"https://docs.google.com/forms/d/e/1FAIpQLSezad_EO1oh9FR7p3rpojGuTgaKgHNMDiXfluXBgQdeN9c3fQ/viewform",description:"Free online workshop from ideas to implementation, with a live demo and code. Covers prompt structure, examples, a code walkthrough and GitHub code examples. Organised by the Centre for International Relations (CIR), CSMU, in collaboration with the Moscow Institute of Physics and Technology (MIPT).",sourceFile:"CIR workshop announcement"}

];

const rooms = [

{n:"SPACE / 01",name:"Central Library — Reading Zone",building:"Central Library",facilities:"Quiet study · Individual desks · Wi-Fi",status:"available",hours:"Library hours"},

{n:"SPACE / 02",name:"Innovation Lab",building:"Architecture Building",facilities:"Project tables · Power outlets · Whiteboard",status:"busy",hours:"Check with department"},

{n:"SPACE / 03",name:"Student Collaboration Area",building:"Student Centre",facilities:"Group study · Lounge seating · Charging",status:"available",hours:"Campus hours"},

{n:"SPACE / 04",name:"Seminar Room B",building:"Academic Block",facilities:"Presentation screen · Group discussion",status:"busy",hours:"Booking may be required"},

{n:"SPACE / 05",name:"Open Courtyard",building:"Main Campus",facilities:"Outdoor seating · Informal study",status:"available",hours:"Campus hours"},

{n:"SPACE / 06",name:"Computer Lab",building:"Computing Block",facilities:"Desktop computers · Internet access",status:"busy",hours:"Class schedule applies"}

];

const starterThreads=[

{id:1,title:"Anyone joining Builders Breakout on 6 October?",body:"Looking for teammates interested in building something useful for the Open Innovation theme. Remember: AWS service required and commits need to be on hackathon day.",category:"Events",author:"CampusMemory team",likes:4,time:"Pinned starter"},

{id:2,title:"Where do you usually study between lectures?",body:"Share your favourite quiet spots or group-study corners around campus. Room availability on this site is only illustrative for now.",category:"Campus life",author:"Student community",likes:2,time:"Community prompt"}

];

let threads=JSON.parse(localStorage.getItem("cm_threads")||"null")||starterThreads;

localStorage.removeItem("cm_user"); // Remove the old demo-only login state.
let currentUser = null;
let isAdmin = false;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const posterInput = $("#noticePoster");
const posterPreviewContainer = $("#posterPreviewContainer");
const posterPreview = $("#posterPreview");
const removePosterBtn = $("#removePosterBtn");
const posterUploadBox = $("#posterUploadBox");

let currentPosterPreviewUrl = null;
let removeExistingPoster = false;

function clearPosterPreview() {
  if (currentPosterPreviewUrl) {
    URL.revokeObjectURL(currentPosterPreviewUrl);
    currentPosterPreviewUrl = null;
  }

  posterPreview.removeAttribute("src");
  posterPreviewContainer.hidden = true;
  posterUploadBox.hidden = false;
}
function showPosterPreview(url, isLocal = false) {
  if (!url) {
    clearPosterPreview();
    return;
  }

  if (
    currentPosterPreviewUrl &&
    currentPosterPreviewUrl.startsWith("blob:")
  ) {
    URL.revokeObjectURL(currentPosterPreviewUrl);
    currentPosterPreviewUrl = null;
  }

  posterPreview.onerror = () => {
    posterPreview.removeAttribute("src");
    posterPreviewContainer.hidden = true;
    posterUploadBox.hidden = false;
  };

  posterPreview.onload = () => {
    posterPreviewContainer.hidden = false;
    posterUploadBox.hidden = true;
  };

  if (isLocal) {
    currentPosterPreviewUrl = url;
  }

  posterPreview.src = url;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2600)}

function go(page){if(page==="admin" && !(currentUser && isAdmin)){toast("Administrator access required.");return;}$$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));$$("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));window.scrollTo({top:0,behavior:"smooth"});if(page==="events")renderEvents();if(page==="discuss")renderThreads();if(page==="rooms")renderRooms();if(page==="after")renderCertEvents();if(page==="admin")renderAdminNotices()}

$$("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

function eventCard(e) {
  const poster = e.poster_url
    ? `<div class="event-poster-wrap">
         <img
           class="event-poster"
           src="${esc(e.poster_url)}"
           alt="${esc(e.title)} poster"
           loading="lazy"
         >
       </div>`
    : "";

  return `<article class="event-card">
    ${poster}
    <div class="event-top">
      <span class="pill">${esc(e.category)}</span>
      <span class="event-id">${esc(e.id)}</span>
    </div>

    <h3>${esc(e.title)}</h3>

    <p class="event-desc">${esc(e.description)}</p>

    <div class="event-meta">
      <div class="meta-row">
        <b>WHEN</b>
        <span>${esc(e.date)} · ${esc(e.time)}</span>
      </div>

      <div class="meta-row">
        <b>WHERE</b>
        <span>${esc(e.venue)}</span>
      </div>
    </div>

    <div class="event-actions">
      <a
        class="btn btn-dark btn-small"
        href="${esc(e.link)}"
        target="_blank"
        rel="noopener noreferrer"
        style="text-decoration:none"
      >
        Open notice ↗
      </a>

      <button class="btn btn-small" data-ask-event="${esc(e.id)}">
        Ask about it
      </button>
    </div>
  </article>`;
}
function renderEvents(){const q=($("#eventSearch")?.value||"").toLowerCase(),cat=$("#categoryFilter")?.value||"All categories";const list=notices.filter(e=>(cat==="All categories"||e.category===cat)&&[e.title,e.category,e.venue,e.description].join(" ").toLowerCase().includes(q));$("#eventsGrid").innerHTML=list.length?list.map(eventCard).join(""):`<div class="empty">No notices match that search. Try another keyword.</div>`;$("#eventsGrid").querySelectorAll("[data-ask-event]").forEach(b=>b.onclick=()=>{openChat();$("#chatInput").value="Tell me about "+notices.find(e=>e.id===b.dataset.askEvent).title;$("#chatInput").focus()})}

function renderHomeEvents(){$("#homeEvents").innerHTML=notices.slice(0,3).map(eventCard).join("");$("#homeEvents").querySelectorAll("[data-ask-event]").forEach(b=>b.onclick=()=>{openChat();$("#chatInput").value="Tell me about "+notices.find(e=>e.id===b.dataset.askEvent).title;$("#chatInput").focus()});$("#statEvents").textContent=String(notices.length).padStart(2,"0")}

function refreshCategoryOptions(){

  const select=$("#categoryFilter"), current=select.value;

  select.innerHTML='<option>All categories</option>';

  [...new Set(notices.map(e=>e.category).filter(Boolean))].sort().forEach(c=>select.insertAdjacentHTML("beforeend",`<option>${esc(c)}</option>`));

  if([...select.options].some(o=>o.value===current)) select.value=current;

}

refreshCategoryOptions();

$("#eventSearch").addEventListener("input",renderEvents);$("#categoryFilter").addEventListener("change",renderEvents);$("#clearFilters").onclick=()=>{$("#eventSearch").value="";$("#categoryFilter").value="All categories";renderEvents()};

/* =========================================
   DISCUSSIONS
========================================= */

let activeDiscussionId = null;

function saveThreads() {
  localStorage.setItem("cm_threads", JSON.stringify(threads));
}

function renderThreads() {
  const host = $("#threadList");

  $("#threadCount").textContent = `/ ${threads.length}`;

  host.innerHTML = threads.length
    ? threads.slice().reverse().map(t => `
        <article class="thread discussion-card" data-discussion="${t.id}">

          <div class="event-top">
            <span class="pill">${esc(t.category)}</span>
            <span class="event-id">${esc(t.time || "Just now")}</span>
          </div>

          <h3>${esc(t.title)}</h3>

          <p>${esc(t.body)}</p>

          <div class="thread-foot">
            <span>
              By ${esc(t.author || "Student")}
            </span>

            <span>
              ${t.replies?.length || 0} replies
            </span>
          </div>

        </article>
      `).join("")
    : `<p>No discussions yet. Start the first one.</p>`;

  host.querySelectorAll("[data-discussion]").forEach(card => {
    card.onclick = () => {
      openDiscussion(card.dataset.discussion);
    };
  });
}


function openDiscussion(id) {

  const discussion = threads.find(t => t.id === id);

  if (!discussion) return;

  activeDiscussionId = id;

  $("#discussionBoard").classList.add("hidden");
  $("#discussionChat").classList.remove("hidden");

  $("#chatCategory").textContent = discussion.category;
  $("#chatTitle").textContent = discussion.title;
  $("#chatQuestion").textContent = discussion.body;
  $("#chatAuthor").textContent = discussion.author || "Student";
  $("#chatTime").textContent = discussion.time || "Just now";

  const initial = (discussion.author || "Student")
    .charAt(0)
    .toUpperCase();

  $("#chatQuestionAvatar").textContent = initial;

  renderReplies();

  $("#replyInput").value = "";
  $("#replyCount").textContent = "0";

  $("#replyInput").focus();
}


function renderReplies() {

  const discussion = threads.find(
    t => t.id === activeDiscussionId
  );

  if (!discussion) return;

  const replies = discussion.replies || [];

  const host = $("#chatReplies");

  if (!replies.length) {

    host.innerHTML = `
      <div class="no-replies">
        <span>Be the first to reply.</span>
        <small>Keep your answer short and useful.</small>
      </div>
    `;

    return;
  }

  host.innerHTML = replies.map((reply, index) => {
const author = reply.author || "Student";
const isMine = reply.mine === true;

return `
  <div class="chat-message ${isMine ? "mine" : ""}">

        <div class="chat-message-avatar">
          ${esc(author.charAt(0).toUpperCase())}
        </div>

        <div class="chat-message-content">

          <div class="chat-message-meta">
            <strong>${esc(author)}</strong>
            <span>${esc(reply.time || "Just now")}</span>
          </div>

          <div class="chat-bubble">
            ${esc(reply.body)}
          </div>

        </div>

      </div>
    `;

  }).join("");
}


$("#threadForm").addEventListener("submit",async e => {

  e.preventDefault();

  const title = $("#threadTitle").value.trim();
  const body = $("#threadBody").value.trim();
  const category = $("#threadCategory").value;

  if (!title) {
    toast("Please enter a topic.");
    $("#threadTitle").focus();
    return;
  }

  if (!body) {
    toast("Please write your question.");
    $("#threadBody").focus();
    return;
  }

  if (title.length > 60) {
    toast("Topic must be 60 characters or less.");
    return;
  }

  if (body.length > 300) {
    toast("Question must be 300 characters or less.");
    return;
  }

  try {
  const authorName =
    currentUser?.user_metadata?.name ||
    currentUser?.email ||
    "Student";

  const created = await createDiscussion({
    title,
    body,
    category,
    userId: currentUser?.id || null,
    authorName
  });

  threads.unshift({
    ...created,
    id: created.id,
    title: created.title,
    body: created.body,
    category: created.category,
    author: created.author_name || authorName,
    likes: created.likes || 0,
    replies: [],
    time: created.created_at
      ? new Date(created.created_at).toLocaleDateString("en-IN")
      : "Just now"
  });

  e.target.reset();
  $("#threadTitleCount").textContent = "0";
  $("#threadBodyCount").textContent = "0";

  renderThreads();

  toast("Discussion posted successfully.");
} catch (error) {
  console.error("Could not create discussion:", error);
  toast(error.message || "Could not post discussion.");
}

  e.target.reset();

  $("#threadTitleCount").textContent = "0";
  $("#threadBodyCount").textContent = "0";

  renderThreads();

  toast("Discussion posted.");
});


$("#replyForm").addEventListener("submit", e => {

  e.preventDefault();

  const input = $("#replyInput");
  const body = input.value.trim();

  if (!body) {
    toast("Write a reply first.");
    input.focus();
    return;
  }

  if (body.length > 200) {
    toast("Reply must be 200 characters or less.");
    return;
  }

  const discussion = threads.find(
    t => t.id === activeDiscussionId
  );

  if (!discussion) return;

  if (!discussion.replies) {
    discussion.replies = [];
  }

  if (discussion.replies.length >= 20) {
    toast("This discussion has reached its reply limit.");
    return;
  }

  discussion.replies.push({
    id: Date.now(),
    body,
    author: currentUser?.name || "Student",
    time: "Just now",
    mine: true
  });

  saveThreads();

  input.value = "";
  $("#replyCount").textContent = "0";

  renderReplies();
});


$("#closeDiscussion").onclick = () => {

  activeDiscussionId = null;

  $("#discussionChat").classList.add("hidden");
  $("#discussionBoard").classList.remove("hidden");

  renderThreads();
};


/* Character counters */

$("#threadTitle").addEventListener("input", e => {
  $("#threadTitleCount").textContent = e.target.value.length;
});

$("#threadBody").addEventListener("input", e => {
  $("#threadBodyCount").textContent = e.target.value.length;
});

$("#replyInput").addEventListener("input", e => {
  $("#replyCount").textContent = e.target.value.length;
});

function renderRooms(){const q=($("#roomSearch")?.value||"").toLowerCase(),s=$("#roomStatus")?.value||"all";const list=rooms.filter(r=>(s==="all"||r.status===s)&&[r.name,r.building,r.facilities].join(" ").toLowerCase().includes(q));$("#roomsGrid").innerHTML=list.map(r=>`<article class="room-card"><span class="room-num">${r.n}</span><h3>${esc(r.name)}</h3><p>${esc(r.building)}<br>${esc(r.facilities)}</p><span class="room-status ${r.status==="busy"?"busy":""}">${r.status==="busy"?"In use / check first":"Listed as available"}</span><p class="mono" style="font-size:9px">${esc(r.hours)}</p><button class="btn btn-small" data-room="${esc(r.name)}">Ask about space ↗</button></article>`).join("")||`<div class="empty">No spaces match those filters.</div>`;$("#roomsGrid").querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>{openChat();$("#chatInput").value="What should I know about "+b.dataset.room+"?";$("#chatInput").focus()})}

$("#roomSearch").addEventListener("input",renderRooms);$("#roomStatus").addEventListener("change",renderRooms);

function renderCertEvents(){const sel=$("#certEvent"),old=sel.value;sel.innerHTML=notices.map(e=>`<option value="${esc(e.id)}">${esc(e.title)}</option>`).join("");if(notices.some(e=>e.id===old))sel.value=old;updateCert()}

function updateCert(){const e=notices.find(e=>e.id===$("#certEvent").value)||notices[0];$("#certPreviewName").textContent=$("#certName").value.trim()||"Your Name";$("#certPreviewEvent").textContent=e?.title||"Campus Event";$("#certPreviewDate").textContent=e?`${e.date} · ${e.venue}`:"Event date · Venue"}

$("#certName").addEventListener("input",updateCert);$("#certEvent").addEventListener("change",updateCert);

function downloadCertificate(){const name=$("#certName").value.trim()||"Your Name",e=notices.find(e=>e.id===$("#certEvent").value)||notices[0];const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=1130;const c=canvas.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,1600,1130);c.strokeStyle="#171717";c.lineWidth=8;c.strokeRect(40,40,1520,1050);c.strokeStyle="#ea580c";c.lineWidth=2;c.strokeRect(65,65,1470,1000);c.textAlign="center";function txt(t,y,size,color,font="Inter"){c.fillStyle=color;c.font=`${size}px ${font}`;c.fillText(t,800,y,1370)}txt("CAMPUSMEMORY / CSMU",180,30,"#ea580c");txt("Certificate of Participation",350,65,"#171717","Georgia");txt("This certificate is a demo preview for",435,27,"#666","Inter");txt(name,555,64,"#171717","Georgia");c.strokeStyle="#aaa";c.lineWidth=1;c.beginPath();c.moveTo(370,585);c.lineTo(1230,585);c.stroke();txt("for taking part in",665,26,"#666");txt(e.title,755,37,"#171717");txt(`${e.date} · ${e.venue}`,820,23,"#666");txt("DEMO PREVIEW · NOT AN OFFICIAL DOCUMENT",990,19,"#888");const a=document.createElement("a");a.download="campusmemory-certificate.png";a.href=canvas.toDataURL("image/png");a.click();toast("Certificate preview downloaded.")}

$("#downloadCert").onclick=downloadCertificate;

async function refreshAuthUser(user) {
  currentUser = user || null;
  isAdmin = false;

if (currentUser) {
  try {
    isAdmin = await verifyAdmin(currentUser);
  } catch (error) {
    console.error("Admin role check failed:", error);
    toast("Signed in, but admin access could not be verified.");
  }
}

  updateUser();
}

function updateUser() {
  const login = $("#loginNav");
  const badge = $("#userBadge");
  const adminNav = $("#adminNav");
  if (adminNav) adminNav.hidden = !(currentUser && isAdmin);

  if (currentUser) {
    login.textContent = "Log out";
    badge.hidden = false;
    badge.className = "brand-mark";
    badge.style.width = "30px";
    badge.style.height = "30px";
    badge.textContent = (currentUser.email || "U").trim()[0].toUpperCase();
    badge.title = currentUser.email || "Signed in";
    badge.setAttribute("aria-label", isAdmin ? "Administrator account" : "Signed-in account");
  } else {
    login.textContent = "Log in";
    badge.hidden = true;
    badge.removeAttribute("aria-label");
  }
}

$("#loginNav").addEventListener("click", async () => {
  if (!currentUser) {
    $("#loginModal").classList.add("open");
    return;
  }

  try {
  await signOut();
  await refreshAuthUser(null);
  toast("Logged out successfully.");
} catch (error) {
  console.error("Logout failed:", error);
  toast("Could not log out. Please try again.");
}
});

$("#closeLogin").onclick=()=>$("#loginModal").classList.remove("open");
$("#loginModal").addEventListener("click",e=>{if(e.target.id==="loginModal")e.currentTarget.classList.remove("open")});

async function handleLogin(form, prefix) {
  if (!supabase) {
    toast("Supabase configuration is missing. Check your .env.local file.");
    return;
  }

  const email = $("#" + prefix + "Email").value.trim();
  const password = $("#" + prefix + "Password").value;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

 let user;

try {
  user = await signIn(email, password);
} catch (error) {
  if (submitButton) submitButton.disabled = false;

  console.error("Supabase login failed:", error);
  toast(error.message || "Login failed. Check your email and password.");
  return;
}

if (submitButton) submitButton.disabled = false;

  await refreshAuthUser(user);
  $("#loginModal").classList.remove("open");
  form.reset();
  go("home");

  if (isAdmin) {
    toast("Welcome, admin. Admin access verified.");
  } else {
    toast("Signed in successfully. You have student access.");
  }
}

$("#modalLoginForm").addEventListener("submit",e=>{e.preventDefault();handleLogin(e.currentTarget,"modal")});
$("#loginForm").addEventListener("submit",e=>{e.preventDefault();handleLogin(e.currentTarget,"login")});

// Restore an existing Supabase session when the page is refreshed.
if (supabase) {
  const { data: authListener } = subscribeToAuthChanges((session) => {
    Promise.resolve().then(() =>
      refreshAuthUser(session?.user || null)
    );
  });

  restoreSession()
    .then((session) => {
      refreshAuthUser(session?.user || null);
    })
    .catch((error) => {
      console.error("Could not restore Supabase session:", error);
    });
}

function openChat(){$("#chatPanel").classList.add("open");$("#chatInput").focus()}function closeChat(){$("#chatPanel").classList.remove("open")}

$("#chatLaunch").onclick=openChat;$("#askNav").onclick=openChat;$("#heroAsk").onclick=openChat;$("#closeChat").onclick=closeChat;

function answerQuestion(q){const low=q.toLowerCase(),found=notices.filter(e=>[e.title,e.category,e.date,e.time,e.venue,e.description].join(" ").toLowerCase().split(/[^\w]+/).some(w=>w.length>3&&low.includes(w)));if(/hackathon|aws|builders breakout/.test(low)){const e=notices.find(e=>e.category==="Hackathon");return e?`${e.title}\nWhen: ${e.date}, ${e.time}\nWhere: ${e.venue}\nDetails: ${e.description}\nRegistration: ${e.link}\n\nSource: ${e.sourceFile}`:"I couldn't find this information in the uploaded campus notices."}if(/register|registration|sign up|form/.test(low)){const e=found[0]||notices.find(e=>e.category==="Hackathon");return e?`Registration details for ${e.title}:\n${e.link}\n\nSource: ${e.sourceFile}`:"I couldn't find this information in the uploaded campus notices."}if(/workshop|multi.agent|mipt|international relations/.test(low)){const e=notices.find(e=>e.category==="Workshop");return `${e.title}\nWhen: ${e.date}, ${e.time}\nWhere: ${e.venue}\n${e.description}\nRegistration: ${e.link}\n\nSource: ${e.sourceFile}`}if(/freshers|aarambh|fest/.test(low)){const e=notices.find(e=>e.category==="Fest");return `${e.title}\nDate: ${e.date}\nVenue: ${e.venue}\n${e.description}\nLink: ${e.link}\n\nSource: ${e.sourceFile}`}if(/deadline|due date/.test(low)){const es=notices.filter(e=>e.deadline);return es.length?es.map(e=>`${e.title}: ${e.deadline}\nSource: ${e.sourceFile}`).join("\n\n"):"I couldn't find a specific registration deadline in the uploaded campus notices."}if(/event|notice|happening|upcoming|list/.test(low)){return "Here are the notices currently in this demo:\n\n"+notices.map(e=>`• ${e.title} — ${e.date}\nSource: ${e.sourceFile}`).join("\n\n")}if(found.length){return found.map(e=>`${e.title}\n${e.date} · ${e.venue}\n${e.description}\nSource: ${e.sourceFile}`).join("\n\n")}return "I couldn't find this information in the uploaded campus notices. This demo Copilot only answers from the three sample notices currently included. Try asking about the AWS hackathon, Aarambh 6.0, or the multi-agent systems workshop."}

function addBubble(text,who){const d=document.createElement("div");d.className="bubble"+(who==="user"?" user":"");d.textContent=text;$("#chatMessages").appendChild(d);$("#chatMessages").scrollTop=$("#chatMessages").scrollHeight}

const COPILOT_API_URL = "https://tdvmsgx548.execute-api.ap-south-1.amazonaws.com/default/campusmemory-copilot";
const chatHistory = [];

async function sendChat(q) {
  q = q.trim();
  if (!q) return;

  addBubble(q, "user");
  $("#chatInput").value = "";

  const typing = document.createElement("div");
  typing.className = "bubble";
  typing.textContent = "Thinking…";
  $("#chatMessages").appendChild(typing);
  $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;

  const btn = $("#chatForm button");
  btn.disabled = true;

  try {
    const context = notices.map(e => `
Title: ${e.title}
Category: ${e.category}
Date: ${e.date}
Time: ${e.time}
Venue: ${e.venue}
Deadline: ${e.deadline || "Not stated"}
Registration: ${e.link}
Details: ${e.description}
Source: ${e.sourceFile}
`).join("\n---\n");

    const response = await fetch(COPILOT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: q,
        context: context,
        history: chatHistory.slice(-8)
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    typing.remove();

    const answer = data.answer || data.body || "I couldn't get a response from Campus Copilot.";

    const answerText = typeof answer === "string" ? answer : JSON.stringify(answer);
    addBubble(answerText, "bot");
    chatHistory.push({ role: "user", text: q }, { role: "assistant", text: answerText });

  } catch (error) {
    console.error("Campus Copilot error:", error);
    typing.remove();

    // Fall back to the built-in keyword answers if Bedrock is unreachable
    addBubble(answerQuestion(q), "bot");

  } finally {
    btn.disabled = false;
  }
}

$("#chatForm").addEventListener("submit",e=>{e.preventDefault();sendChat($("#chatInput").value)});$$("[data-question]").forEach(b=>b.onclick=()=>sendChat(b.dataset.question));

renderHomeEvents();renderEvents();renderThreads();renderRooms();renderCertEvents();updateUser();



async function loadNoticesFromSupabase() {
  try {
    const data = await getNotices();
console.log("LIVE NOTICES FROM SUPABASE:", data);
    notices = (data || []).map(mapNoticeRow);

   refreshCategoryOptions();
renderHomeEvents();
renderEvents();
renderCertEvents();

if (currentUser && isAdmin) {
  renderAdminNotices();
}
    toast(`Loaded ${notices.length} notices from CampusMemory.`);
  } catch (error) {
    console.error("Supabase notices load failed:", error);
    toast("Could not load live notices. Showing demo notices.");
  }
}

function toLocalInput(value) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const pad = n => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateForDatabase(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapNoticeRow(row) {
  const formatDate = value =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata"
        })
      : "To be announced";

  const formatTime = value =>
    value
      ? new Date(value).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata"
        })
      : "Time to be announced";

  return {
    id: row.id,
    title: row.title,
    category: row.category || "General",
    date: formatDate(row.event_date),
    time: formatTime(row.event_date),
    venue: row.venue || "To be announced",
    deadline: row.deadline ? formatDate(row.deadline) : "",
    link: row.registration_url || "#",
    description: row.description || "No description provided.",
    sourceFile: row.source_name || "Campus notice",
poster_url: row.poster_url || "",
rawEventDate: row.event_date,
    rawDeadline: row.deadline
  };
}

function resetNoticeForm() {
  $("#noticeForm").reset();

  $("#noticeId").value = "";
  $("#noticeCategory").value = "General";

  removeExistingPoster = false;

  clearPosterPreview();

  $("#noticeFormTitle").textContent = "Add a notice";
  $("#saveNoticeBtn").textContent = "Save notice ↗";
  $("#cancelNoticeEdit").hidden = true;
}

function updateAdminStats() {
  const now = Date.now();

  $("#adminTotal").textContent = notices.length;

  $("#adminUpcoming").textContent =
    notices.filter(
      n =>
        n.rawEventDate &&
        new Date(n.rawEventDate).getTime() >= now
    ).length;

  $("#adminCategories").textContent =
    new Set(
      notices
        .map(n => n.category)
        .filter(Boolean)
    ).size;
}

function renderAdminNotices() {
  if (!(currentUser && isAdmin)) {
    toast("Administrator access required.");
    return;
  }

  updateAdminStats();

  const host = $("#adminNoticeList");

  if (!notices.length) {
    host.innerHTML =
      '<p class="empty">No notices yet. Add the first one.</p>';

    return;
  }

  host.innerHTML = notices
    .map(
      n => `
        <article class="admin-notice">

          ${
            n.poster_url
              ? `
                <img
                  class="admin-notice-poster"
                  src="${esc(n.poster_url)}"
                  alt="${esc(n.title)} poster"
                  loading="lazy"
                  onerror="this.remove()"
                >
              `
              : ""
          }

          <div class="event-top">
            <span class="pill">
              ${esc(n.category || "General")}
            </span>

            <span class="event-id">
              ${esc(String(n.id).slice(0, 8))}
            </span>
          </div>

          <h3>${esc(n.title)}</h3>

          <p>
            ${esc(n.date || "Date to be announced")}
            ·
            ${esc(n.venue || "Venue to be announced")}
          </p>

          <div class="admin-actions">
            <button
              class="btn btn-small"
              type="button"
              data-edit-notice="${esc(n.id)}"
            >
              Edit
            </button>

            <button
              class="btn btn-small"
              type="button"
              data-delete-notice="${esc(n.id)}"
            >
              Delete
            </button>
          </div>

        </article>
      `
    )
    .join("");

  host
    .querySelectorAll("[data-edit-notice]")
    .forEach(button => {
      button.onclick = () =>
        editNotice(button.dataset.editNotice);
    });

  host
    .querySelectorAll("[data-delete-notice]")
    .forEach(button => {
      button.onclick = () =>
        deleteNotice(button.dataset.deleteNotice);
    });
}
function editNotice(id) {
  const n = notices.find(item => String(item.id) === String(id));

  if (!n) {
    toast("Could not find this notice.");
    return;
  }

  removeExistingPoster = false;

  $("#noticeId").value = n.id;
  $("#noticeTitle").value = n.title || "";
  $("#noticeCategory").value = n.category || "General";
  $("#noticeDescription").value = n.description || "";

  $("#noticeDate").value = toLocalInput(n.rawEventDate);
  $("#noticeDeadline").value = toLocalInput(n.rawDeadline);

  $("#noticeVenue").value = n.venue || "";
  $("#noticeLink").value =
    n.link && n.link !== "#" ? n.link : "";
  $("#noticeSource").value = n.sourceFile || "";

  // Reset file input
  $("#noticePoster").value = "";

  // Show existing poster
  showPosterPreview(n.poster_url || "");

  // Switch form into edit mode
  $("#noticeFormTitle").textContent = "Edit notice";
  $("#saveNoticeBtn").textContent = "Update notice ↗";
  $("#cancelNoticeEdit").hidden = false;

  // Bring the form into view
  $("#noticeForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function refreshNoticesFromDatabase(
  showToast = true
) {
  if (!(currentUser && isAdmin)) {
    toast("Administrator access required.");
    return;
  }

  try {
    const data = await getNotices();

    notices = (data || []).map(mapNoticeRow);

    refreshCategoryOptions();
    renderHomeEvents();
    renderEvents();
    renderCertEvents();
    renderAdminNotices();

    if (showToast) {
      toast("Notices refreshed.");
    }
  } catch (error) {
    console.error(
      "Admin notice refresh failed:",
      error
    );

    toast(
      "Could not refresh notices: " +
        error.message
    );
  }
}

$("#noticeForm").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    if (!(currentUser && isAdmin)) {
      toast("Administrator access required.");
      return;
    }

    const id =
      $("#noticeId").value;

    const posterFile =
      posterInput.files?.[0] || null;

    const existingNotice = id
      ? notices.find(
          n =>
            String(n.id) ===
            String(id)
        )
      : null;

    const button =
      $("#saveNoticeBtn");

    const payload = {
      title:
        $("#noticeTitle")
          .value
          .trim(),

      category:
        $("#noticeCategory")
          .value
          .trim() || "General",

      description:
        $("#noticeDescription")
          .value
          .trim() || null,

      event_date:
        dateForDatabase(
          $("#noticeDate").value
        ),

      deadline:
        dateForDatabase(
          $("#noticeDeadline").value
        ),

      venue:
        $("#noticeVenue")
          .value
          .trim() || null,

      registration_url:
        $("#noticeLink")
          .value
          .trim() || null,

      source_name:
        $("#noticeSource")
          .value
          .trim() || null,

      // Preserve existing poster unless
      // administrator explicitly removes it.
      poster_url:
        removeExistingPoster
          ? null
          : existingNotice?.poster_url || null
    };

    if (
      payload.registration_url &&
      !/^https?:\/\//i.test(
        payload.registration_url
      )
    ) {
      toast(
        "Registration URL must start with http:// or https://"
      );

      return;
    }

    button.disabled = true;

    try {
      // If a new poster was selected,
      // upload it first.
      if (posterFile) {
        payload.poster_url =
          await uploadNoticePoster(
            posterFile
          );
      }

      if (id) {
        await updateNotice(
          id,
          payload
        );
      } else {
        await addNotice(
          payload
        );
      }

      resetNoticeForm();

      await refreshNoticesFromDatabase(
        false
      );

      toast(
        id
          ? "Notice updated successfully."
          : "Notice added successfully."
      );

    } catch (error) {
      console.error(
        "Notice save failed:",
        error
      );

      toast(
        "Could not save notice: " +
          (error?.message ||
            "Unknown error")
      );

    } finally {
      button.disabled = false;
    }
  }
);

async function deleteNotice(id) {
  if (!(currentUser && isAdmin)) {
    toast("Administrator access required.");
    return;
  }

  const n = notices.find(
    x =>
      String(x.id) ===
      String(id)
  );

  if (
    !n ||
    !confirm(
      `Delete “${n.title}”? This cannot be undone.`
    )
  ) {
    return;
  }

  try {
    await deleteNoticeFromDatabase(id);

    await refreshNoticesFromDatabase(
      false
    );

    toast(
      "Notice deleted successfully."
    );

  } catch (error) {
    console.error(
      "Notice deletion failed:",
      error
    );

    toast(
      "Could not delete notice: " +
        error.message
    );
  }
}

$("#cancelNoticeEdit").onclick =
  resetNoticeForm;

$("#refreshAdminNotices").onclick =
  () =>
    refreshNoticesFromDatabase();


// Initial live notice load
loadNoticesFromSupabase();


// Poster upload preview
posterInput.addEventListener(
  "change",
  () => {
    const file =
      posterInput.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (
      !allowedTypes.includes(
        file.type
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      posterInput.value = "";

      toast(
        "Choose a JPG, PNG or WebP image smaller than 5 MB."
      );

      return;
    }

    removeExistingPoster = false;

    const previewUrl =
      URL.createObjectURL(file);

    showPosterPreview(
      previewUrl,
      true
    );
  }
);


// Remove poster
removePosterBtn.addEventListener(
  "click",
  event => {
    event.preventDefault();

    removeExistingPoster = true;

    posterInput.value = "";

    clearPosterPreview();
  }
);
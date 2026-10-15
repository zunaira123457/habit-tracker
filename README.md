# 🐱 Paw Streak

**A daily habit tracker where a little cat grows with your streak.**

Paw Streak is a to-do tracker built around *non-negotiables*: the few things you promise yourself you'll do every single day. Finish all of them and your streak goes up. Miss one and it resets to zero. Your cat, Mochi, starts as a sleepy kitten in a basket and grows into a crowned, sparkling royal cat as your streak gets longer.

**[▶ Open the live app](https://habit-tracker-lilac-kappa.vercel.app)**

![Paw Streak dashboard on desktop: today's tasks on the left, the cat, streak stats and a mini calendar on the right](screenshots/desktop-today.png)

---

## Contents

- [What it does](#what-it-does)
- [Screenshots](#screenshots)
- [How it works](#how-it-works)
  - [Tasks: time and count](#tasks-time-and-count)
  - [Non-negotiables vs. bonus tasks](#non-negotiables-vs-bonus-tasks)
  - [Streak rules](#streak-rules)
  - [The growing cat](#the-growing-cat)
  - [History calendar](#history-calendar)
  - [Settings](#settings)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Your data and privacy](#your-data-and-privacy)
- [Running it yourself](#running-it-yourself)
- [Tech details](#tech-details)
- [FAQ](#faq)

---

## What it does

| | |
|---|---|
| ✅ **Daily task list** | Track habits that are measured in **minutes** (Read for 20 min) or as a **count** (8 glasses of water, 50 pushups). |
| 🔒 **Non-negotiables** | Mark your must-do habits. A day only counts if *all* of them are finished. |
| 🔥 **Streaks** | See your current streak and your longest streak ever. Missed days, including days you didn't open the app, reset the streak. |
| 🐱 **A cat that grows** | Six growth stages from "Sleepy Bean" to "Legendary Royal". The cat reacts when you finish tasks and looks sad if you lose your streak. |
| 📅 **History calendar** | A month view coloured green (streak kept) or red (streak lost). Click any day to see exactly what you did. |
| 🌗 **Light and dark mode** | Follows your system setting by default, or pick one yourself. |
| 📱 **Works everywhere** | Sidebar layout on desktop, icon rail on tablet, bottom tab bar on phones. |
| 🔐 **Private by design** | No account, no server, no tracking. Everything stays in your browser. |

---

## Screenshots

### Today (desktop)

The main dashboard. Tasks are on the left, grouped into **Non-negotiables** and **Bonus tasks**. Each row has a progress ring that turns into a green check when the task is done, a progress bar, and quick controls. The right panel shows your cat, your streak stats, and this month at a glance.

![Today view in light mode with a 12-day streak, a running timer on Read, and Drink water completed](screenshots/desktop-today.png)

### Dark mode, at the top level

After 100+ days your cat becomes a **Legendary Royal** with a crown, cape and sparkles. When every non-negotiable is done for the day, the cat celebrates and confetti falls.

![Dark mode with a 131-day streak, all tasks complete, and the royal cat](screenshots/desktop-today-dark.png)

### History

A full-month calendar. Green days kept the streak, red days lost it, and today is outlined. Clicking a day opens a side panel showing each task's progress against its target for that day.

![History calendar with a missed day selected and its details open in a side panel](screenshots/desktop-history.png)

### Adding or editing a task

Pick a name, an icon, the type (Time or Count), a daily target, and whether it's a non-negotiable.

![Edit task dialog for Pushups: count type, target 50 reps, marked non-negotiable](screenshots/task-form.png)

### On your phone

Single-column layout with a bottom tab bar and large tap targets. Dialogs and day details slide up as bottom sheets.

![Phone screenshots: the Today view and the History view with a day's details in a bottom sheet](screenshots/mobile.png)

---

## How it works

### Tasks: time and count

Every task is one of two types:

| Type | Example | How you log progress | Done when |
|---|---|---|---|
| ⏱️ **Time** | Read – 20 min | Press **Start** to run a built-in timer, **Pause** to stop it, or type minutes into the box and press **Add**. | The minutes reach the target. |
| 🔢 **Count** | Drink water – 8 glasses | Tap **−** / **+**, or type an amount into the box and press **Add**. | The count reaches the target. |

A few details:

- **The timer keeps going if you close the tab.** It remembers when you pressed Start, so coming back later shows the right time.
- **Only one timer runs at a time.** Starting a second task's timer pauses the first.
- **You can fix mistakes.** Type a negative number (like `-5`) into the Add box to subtract.
- **You can go over your target.** Reading 30 minutes on a 20-minute goal is fine and is saved in your history.

### Non-negotiables vs. bonus tasks

- 🔒 **Non-negotiables** are your daily must-dos. They are the *only* tasks that decide whether your streak survives.
- 🌸 **Bonus tasks** are nice-to-haves. Track them for your own satisfaction; they never affect your streak.

You can switch a task between the two at any time in **Settings**.

### Streak rules

1. A day is a **success** only if **every** non-negotiable reaches its target that day.
2. Each successful day in a row adds **1** to your streak.
3. If a day ends with **any** non-negotiable unfinished, the streak goes back to **0**.
4. Days you **didn't open the app** count as missed. When you come back, the app fills in those days as red.
5. **Today counts as soon as you finish.** The moment your last non-negotiable is done, your streak goes up and the cat may grow right away. Today can't *break* your streak until midnight.
6. Progress **resets at midnight** (your local time). Yesterday's results are saved to your history first.
7. You need **at least one non-negotiable** for a day to count. An empty list can't build a streak.

Your **longest streak** is remembered separately, so a reset never erases your record.

### The growing cat

Your cat's size and look depend on your **current streak**:

![The six growth stages of the cat, from a kitten sleeping in a basket to a royal cat with a crown and sparkles](screenshots/cat-stages.png)

| Level | Stage | Streak | Look |
|:---:|---|---|---|
| 1 | Sleepy Bean | 0 days | A kitten curled up asleep in a basket |
| 2 | Tiny Kitten | 1–6 days | A small kitten with a collar and bell |
| 3 | Playful Kitty | 7–20 days | A young cat playing with a ball of yarn |
| 4 | Grown Cat | 21–49 days | A full-grown cat |
| 5 | Fluffy Noble | 50–99 days | A big, fluffy cat with a little crown |
| 6 | Legendary Royal | 100+ days | A royal cat with a bigger crown, a cape and sparkles |

The cat card also shows your cat's **name**, its **level**, and **how many days until the next stage**.

**The cat reacts to what you do:**

![The cat's moods: sleeping, sad with a rain cloud, idle, and happy](screenshots/cat-moods.png)

- 💤 **Sleeping** when you haven't started a streak yet.
- 🌧️ **Sad**, with a tear and a little rain cloud, if yesterday was missed and your streak was lost.
- 😺 **Idle** the rest of the time: it blinks, breathes and swishes its tail.
- 😸 **Happy** with sparkles once all of today's non-negotiables are done.
- 🎉 It **hops** each time you finish a task and **celebrates with confetti** when you finish the last non-negotiable.
- 🐾 **Click or tap the cat** to pet it.

### History calendar

- 🟩 **Green**: all non-negotiables were completed (streak kept).
- 🟥 **Red**: at least one non-negotiable was missed (streak lost).
- ⬜ **Gray**: before you started using the app, or a day that hasn't happened yet.
- 🔲 **Outlined**: today. It fills in green once today's non-negotiables are done.

Use the arrows to move between months, or **Today** to jump back. Clicking a day shows each task's progress versus its target **as it was on that day**, so editing a task later doesn't rewrite your history. The top of the page shows your current streak, longest streak, total days kept, and success rate.

### Settings

- **Cat name**: rename your cat (it's Mochi by default).
- **Appearance**: System, Light or Dark.
- **Tasks**: add, edit or delete tasks. For each task you can set the name, icon, type, daily target, unit label (for counts, like "glasses" or "reps"), and whether it's a non-negotiable.
- **Reset all data**: erases every task, all history and your streaks after asking you to confirm.

The app starts with three example tasks so it isn't empty on first open: **Read – 20 min** (non-negotiable), **Drink water – 8 glasses** (non-negotiable), and **Stretch – 10 min** (bonus). Edit or delete them as you like.

---

## Keyboard shortcuts

On desktop:

| Key | Action |
|:---:|---|
| `1` | Go to Today |
| `2` | Go to History |
| `3` | Go to Settings |
| `N` | New task |
| `Esc` | Close a dialog or panel |
| `Enter` | Add the amount typed in a task's box |

---

## Your data and privacy

- **Everything is stored in your browser** using `localStorage`. There is no account, no backend, and nothing is sent anywhere.
- **Data is per browser, per device.** Your phone and your laptop each keep their own separate tracker. Clearing your browser's site data erases your habits.
- The only outside request is for the web fonts (Inter and Fredoka from Google Fonts). If they can't load, the app falls back to your system fonts.

---

## Running it yourself

The whole app is a **single file**, [`index.html`](index.html), with all the HTML, CSS and JavaScript inside. There is nothing to install and no build step.

**Option 1: open it directly.** Download `index.html` and double-click it to open it in your browser.

**Option 2: serve it locally.**

```bash
git clone https://github.com/zunaira123457/habit-tracker.git
cd habit-tracker
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

**Option 3: deploy it.** Any static host works (Vercel, Netlify, GitHub Pages and so on), because it's just one HTML file. The live version is deployed on Vercel:

```bash
npx vercel deploy --prod
```

> **Tip for phones:** open the live link and choose **Add to Home Screen** so it's one tap away. On iPhone it then opens full-screen like an app.

---

## Tech details

- **One self-contained HTML file**: plain HTML, CSS and JavaScript, with no frameworks and no dependencies.
- **The cat is drawn entirely in SVG** by code. There are no image files, and its idle animations (blinking, breathing, tail swishing) are CSS animations.
- **Responsive layout** with CSS Grid and container queries:
  - **Desktop (1024px and up):** sidebar plus a dashboard grid with a right-hand panel.
  - **Tablet (640–1023px):** collapsible icon sidebar.
  - **Phone (under 640px):** bottom tab bar, single column, 44px tap targets, bottom-sheet dialogs.
- **Accessible:** keyboard navigation with visible focus rings, focus kept inside open dialogs, labelled controls, and reduced motion when your system asks for it.
- **Theming** with CSS custom properties, for both light and dark palettes.

### Project structure

```
habit-tracker/
├── index.html        # the entire app
├── README.md         # this file
└── screenshots/      # images used in this README
```

---

## FAQ

**Why did my streak reset when I didn't do anything wrong?**
Most likely a day passed without the app being opened. Days you don't check in count as missed, because the app can't know you did your habits. Open the History tab to see which day turned red.

**I finished my tasks but forgot to log them. Can I fix a past day?**
Not at the moment. Only today's progress can be changed. Past days are saved exactly as they were at midnight.

**If I change a task's target, does that change my history?**
No. History keeps a snapshot of each task's target and progress as they were on that day.

**Can I use it on more than one device?**
Yes, but each device keeps its own data. There's no sync between them.

**Does the timer keep running if I close the app?**
Yes. Pause it when you're done. If a timer is still running at midnight, only the time up to midnight counts for that day.

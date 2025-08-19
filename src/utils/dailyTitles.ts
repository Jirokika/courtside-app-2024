// Daily rotating titles for the sport selection section
export const getDailyTitle = (): string => {
  const today = new Date()
  const dayOfMonth = today.getDate() // 1-31
  const dayOfWeek = today.getDay() // 0-6 (Sunday = 0)
  const month = today.getMonth() // 0-11
  
  // Different title sets for variety
  const genZTitles = [
    "What's the move today? 🏸 or 🏓?",
    "Pick your poison: Badminton or Pickleball?",
    "What's the tea? Badminton or Pickleball?",
    "No cap, which one you choosing?",
    "Bet! Pick your court and let's go",
    "Fr fr, what's your pick?",
    "Spill the tea: which court we booking?",
    "Let's get this bread! Which court we hitting?"
  ]
  
  const gamingTitles = [
    "Select your character: 🏸 or 🏓",
    "Choose your fighter!",
    "Pick your weapon: Badminton or Pickleball",
    "Game on! Which court you picking?",
    "Show me what you got! 🏸 vs 🏓"
  ]
  
  const fitnessTitles = [
    "Time to sweat! What's your jam?",
    "Let's get moving! Pick your sport",
    "Workout time! Which court calls to you?",
    "Fitness goals! What's your pick?",
    "Time to get active! What's your vibe?"
  ]
  
  const casualTitles = [
    "Alright, what are we playing today?",
    "Let's do this! Pick your court",
    "Game time! What's your choice?",
    "Which games are we vibing with today?",
    "What's your pick today?"
  ]
  
  // Algorithm 1: Use day of month to cycle through all titles
  const allTitles = [...genZTitles, ...gamingTitles, ...fitnessTitles, ...casualTitles]
  const titleIndex = dayOfMonth % allTitles.length
  
  // Algorithm 2: Use different sets based on day of week
  let selectedTitle: string
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    selectedTitle = genZTitles[dayOfMonth % genZTitles.length]
  } else if (dayOfWeek === 1 || dayOfWeek === 2) { // Monday/Tuesday
    selectedTitle = fitnessTitles[dayOfMonth % fitnessTitles.length]
  } else if (dayOfWeek === 3 || dayOfWeek === 4) { // Wednesday/Thursday
    selectedTitle = gamingTitles[dayOfMonth % gamingTitles.length]
  } else { // Friday
    selectedTitle = casualTitles[dayOfMonth % casualTitles.length]
  }
  
  // Use the weekend algorithm for more variety
  return selectedTitle
}

// Alternative: Pure random selection (changes on page refresh)
export const getRandomTitle = (): string => {
  const titles = [
    "What's the move today? 🏸 or 🏓?",
    "Pick your poison: Badminton or Pickleball?",
    "Select your character: 🏸 or 🏓",
    "What's the tea? Badminton or Pickleball?",
    "No cap, which one you choosing?",
    "Bet! Pick your court and let's go",
    "Fr fr, what's your pick?",
    "Choose your fighter!",
    "Pick your weapon: Badminton or Pickleball",
    "Game on! Which court you picking?",
    "Time to sweat! What's your jam?",
    "Let's get moving! Pick your sport",
    "Workout time! Which court calls to you?",
    "Fitness goals! What's your pick?",
    "Alright, what are we playing today?",
    "Time to get active! What's your vibe?",
    "Let's do this! Pick your court",
    "Game time! What's your choice?",
    "Show me what you got! 🏸 vs 🏓",
    "Spill the tea: which court we booking?",
    "Let's get this bread! Which court we hitting?",
    "Which games are we vibing with today?"
  ]
  
  return titles[Math.floor(Math.random() * titles.length)]
} 
#!/bin/bash
API="http://localhost:3000/api"
TOKEN=$(curl -s -X POST $API/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gabe@valdivia.works","password":"T0bylis@!0323"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

post() {
  curl -s -X POST "$API/$1" \
    -H "Content-Type: application/json" \
    -H "Authorization: JWT $TOKEN" \
    -d "$2"
}

update_global() {
  curl -s -X POST "$API/globals/$1" \
    -H "Content-Type: application/json" \
    -H "Authorization: JWT $TOKEN" \
    -d "$2"
}

echo "=== Creating Services ==="
for s in '{"title":"Product Design","slug":"product-design","order":1}' \
         '{"title":"Branding","slug":"branding","order":2}' \
         '{"title":"Web Design","slug":"web-design","order":3}' \
         '{"title":"Strategy","slug":"strategy","order":4}' \
         '{"title":"Pitch Decks","slug":"pitch-decks","order":5}' \
         '{"title":"Design Systems","slug":"design-systems","order":6}' \
         '{"title":"Team Building","slug":"team-building","order":7}' \
         '{"title":"Coaching","slug":"coaching","order":8}'; do
  post "services" "$s" > /dev/null
done
echo "Done"

echo "=== Creating Testimonials ==="
T1=$(post "testimonials" '{"quote":"I cannot recommend Gabe enough. Truly world-class in every sense of the word. From helping to visualize an ambitious product story & vision, to playing an active role in bringing on senior full-time talent, and everything in between — Gabe can seemingly do it all. Our product, team, culture, and customers are in a stronger position thanks to our time together.","author":"Jinen Kamdar","role":"CPO","company":"Gather","order":1}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
T2=$(post "testimonials" '{"quote":"Gabe is a master at taming the chaos of the 0 → 1 process. He has the rare ability to jump into the early stages of open-ended projects and rapidly develop structure and systems. He is proactive, works with little to no direction — and he is also very fast!","author":"Tanuj Lalwani","role":"Head of Design","company":"Daylight","order":2}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
T3=$(post "testimonials" '{"quote":"Gabe is a superb designer. He grasps what we are seeking to build and is lightning fast at turning our thoughts into designs. This facilitates a quick feedback cycle leading to designs we are all happy with in an impressively short period of time.","author":"Greg Dooley","role":"Engineering Partner","company":"GV","order":3}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
T4=$(post "testimonials" '{"quote":"I was blown away by Gabe ability to quickly synthesize complexity and simplify it for different audiences. Working with Gabe was both fun and productive. Delivery of high quality at high velocity is his superpower.","author":"Natasha Awasthi","role":"Head of Product","company":"Ritual Dental","order":4}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
T5=$(post "testimonials" '{"quote":"Gabe zipped in to our team seamlessly, brought well researched insights and strategic thinking to every concept, and polished the details to a high-shine. We are extremely pleased with the work — not only the output but the process to get there.","author":"Meghan Harvey","role":"Co-Founder","company":"Bindery Books","order":5}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
T6=$(post "testimonials" '{"quote":"Gabe is an exceptional 0 → 1 design thinker and partner to early-stage founders. He made major contributions to our brand identity and key features. Highly recommend!","author":"Sandeep Rajan","role":"CEO","company":"Grandstand","order":6}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
echo "Done ($T1, $T2, $T3, $T4, $T5, $T6)"

echo "=== Creating Clients ==="
for c in \
  '{"name":"1099Policy","description":"Fractional insurance for on-demand work force","website":"https://1099policy.com","order":1}' \
  '{"name":"Bindery Books","description":"Empowering tastemakers to become publishers","website":"https://binderybooks.com","order":2}' \
  '{"name":"Daylight Computer","description":"A computer for deep focus and wellbeing","website":"https://daylightcomputer.com","order":3}' \
  '{"name":"Dex","description":"The language learning camera","website":"https://dex.camera","order":4}' \
  '{"name":"Gather","description":"Virtual HQ for distributed teams","website":"https://gather.town","order":5}' \
  '{"name":"Goodword","description":"Relationship copilot for super connectors","website":"https://goodword.com","order":6}' \
  '{"name":"Google Ventures","description":"CRM for venture capital","website":"https://gv.com","order":7}' \
  '{"name":"Grandstand","description":"Direct-to-fan platform for athletes","website":"https://grandstand.is","order":8}' \
  '{"name":"Kiosk","description":"AI-powered content agent","website":"https://kio.sk","order":9}' \
  '{"name":"National Design Studio","description":"Improving the American Government experience","website":"https://ndstudio.gov","order":10}' \
  '{"name":"Profile","description":"Building intelligent search systems","website":"https://profile.com","order":11}' \
  '{"name":"Roon","description":"Online community for physicians","website":"https://roon.com","order":12}' \
  '{"name":"Ritual Dental","description":"Personalized preventative oral care","website":"https://ritualdental.com","order":13}' \
  '{"name":"Sensible","description":"A high yield account for crypto (acq. by Coinbase)","website":"https://holdsensible.com","order":14}' \
  '{"name":"Slingshot","description":"Mental health AI research","website":"https://slingshotai.com","order":15}' \
  '{"name":"SuperMe","description":"The superpowered expertise network","website":"https://superme.ai","order":16}' \
  '{"name":"Supper","description":"Business intelligence AI platform","website":"https://supper.co","order":17}' \
  '{"name":"Tavus","description":"AI Humans that connect face-to-face","website":"https://tavus.io","order":18}' \
  '{"name":"The Majority Group","description":"Evolving the style-status-quo","website":"https://themajoritygroup.com","order":19}' \
  '{"name":"Workmate","description":"Proactive AI executive assistant","website":"https://workmate.com","order":20}' \
  '{"name":"World Playground","description":"Commission-free booking platform","website":"https://worldplayground.co","order":21}'; do
  post "clients" "$c" > /dev/null
done
echo "Done"

echo "=== Creating Projects ==="
P1=$(post "projects" '{"title":"Dex","slug":"dex","subtitle":"The language learning camera","order":1,"featured":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
P2=$(post "projects" '{"title":"Daylight","slug":"daylight","subtitle":"A more caring computer","order":2,"featured":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
P3=$(post "projects" '{"title":"Workmate","slug":"workmate","subtitle":"Your AI Executive Assistant","order":3,"featured":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
P4=$(post "projects" '{"title":"Slingshot AI","slug":"slingshot","subtitle":"Personalized AI counselor","order":4,"featured":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['doc']['id'])")
for p in \
  '{"title":"Supper","slug":"supper","subtitle":"Business intelligence AI platform","order":5}' \
  '{"title":"Grandstand","slug":"grandstand","subtitle":"Sport fans communities","order":6}' \
  '{"title":"Patreon 2.0","slug":"patreon","subtitle":"Connecting creators with superfans","order":7}' \
  '{"title":"Shoebox","slug":"shoebox","subtitle":"Curated podcast playlists","order":8}' \
  '{"title":"Tonic","slug":"tonic","subtitle":"Private recommendation engine","order":9}' \
  '{"title":"Sensible","slug":"sensible","subtitle":"A high yield crypto account","order":10}' \
  '{"title":"Facebook 360","slug":"fb-360","subtitle":"Immersive media and spatial design","order":11}' \
  '{"title":"Facebook Sharing","slug":"fb-sharing","subtitle":"Connecting billions of friends","order":12}' \
  '{"title":"Facebook Pages","slug":"fb-pages","subtitle":"Helping small businesses thrive","order":13}' \
  '{"title":"Ritual Dental","slug":"ritual","subtitle":"Personalized preventative oral care","order":14}' \
  '{"title":"Automatic","slug":"automatic","subtitle":"Smart driving assistant","order":15}' \
  '{"title":"1099Policy","slug":"1099policy","subtitle":"Fractional insurance for contractors","order":16}'; do
  post "projects" "$p" > /dev/null
done
echo "Done (featured: $P1, $P2, $P3, $P4)"

echo "=== Creating Side Projects ==="
for sp in \
  '{"title":"Recall","description":"A daily reflection app to fill any gaps","order":1}' \
  '{"title":"Life OS","description":"A second brain out of markdown files","order":2}' \
  '{"title":"Sumi","description":"The fastest way to commit your thoughts","order":3}' \
  '{"title":"Slackdone","description":"A single Kanban across Slack workspaces","url":"https://slackdone.vercel.app/","order":4}' \
  '{"title":"Venn","description":"Group recommendations for Youtube videos","url":"https://vennvideo.vercel.app/dashboard","order":5}' \
  '{"title":"Falkor","description":"Collaborative storytelling with AI","url":"https://falkor.ink","order":6}' \
  '{"title":"Katamari","description":"Social photo grid","url":"https://www.katamari.app","order":7}' \
  '{"title":"Senso","description":"News through an ancient lens","url":"https://www.senso.news","order":8}' \
  '{"title":"Promptly","description":"Auto-scrolling teleprompter","order":9}' \
  '{"title":"Big Year","description":"A calendar for all-day events","url":"https://bigyear.app","order":10}' \
  '{"title":"Skunk","description":"Social leaderboard for board games","url":"https://skunk.games","order":11}' \
  '{"title":"Liveblog","description":"Time-based notes","order":12}' \
  '{"title":"Flicktionary","description":"Guess the movie poster","url":"https://www.flicktionary.com/","order":13}' \
  '{"title":"Letterfall","description":"Create words from falling letters","url":"https://letterfall.app/","order":14}' \
  '{"title":"Rolodex","description":"Email-based personal CMS","order":15}' \
  '{"title":"Projector","description":"Budgeting tool for fractional design","url":"https://projector.design","order":16}' \
  '{"title":"Almanac","description":"A countdown for important events","order":17}' \
  '{"title":"Makeshift","description":"A co-working space for designers","order":18}' \
  '{"title":"Vectors","description":"Exploring how identity informs creative work","order":19}' \
  '{"title":"Talk Turkey","description":"Candid interviews via chat","order":20}'; do
  post "side-projects" "$sp" > /dev/null
done
echo "Done"

echo "=== Setting Globals ==="
update_global "site-settings" '{"title":"Gabriel Valdivia","description":"Fractional Design Partner for Early-Stage Teams","copyright":"© Copyright 2026","socialLinks":[{"platform":"Twitter","url":"https://twitter.com/gabrielvaldivia"},{"platform":"LinkedIn","url":"https://linkedin.com/in/gabrielvaldivia"}]}' > /dev/null

update_global "navigation" '{"items":[{"label":"Work","url":"/work","newTab":false},{"label":"About","url":"/about","newTab":false},{"label":"Contact","url":"/#contact","newTab":false}]}' > /dev/null

FAQ='[{"question":"What is fractional design leadership?","answer":{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"Fractional leadership is a flexible model where organizations engage part-time design leaders to drive and guide design strategies and initiatives, without the need for full-time employment."}],"version":1}],"direction":"ltr","format":"","indent":0,"version":1}}},{"question":"Why not hire a full-time product designer?","answer":{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"Navigating the hiring process for a full-time designer can be risky and time-consuming. Opting to work with me offers a flexible and lower-commitment solution, ideal for situations where time is of the essence."}],"version":1}],"direction":"ltr","format":"","indent":0,"version":1}}},{"question":"Do you have a team?","answer":{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"I have a couple designers on staff to help with production work and can tap into a larger network of design collaborators. That said, you will always interact directly with me at every step of the way."}],"version":1}],"direction":"ltr","format":"","indent":0,"version":1}}},{"question":"What is your pricing structure?","answer":{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"I prefer to work with a flat weekly retainer so we can focus on the work without worrying about tracking hours, limited revisions, or rigidly defined scopes. We end when the work is done."}],"version":1}],"direction":"ltr","format":"","indent":0,"version":1}}},{"question":"What is your availability?","answer":{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"I am generally available every weekday through Slack and open to Zoom/in-person meetings on Tuesdays and Thursdays."}],"version":1}],"direction":"ltr","format":"","indent":0,"version":1}}}]'

ABOUT='{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"I help early-stage startups ship fast without compromising quality. I have spent the last fifteen years building 0-to-1 products for the worlds top tech companies. Today, I partner with founders to bring their ideas to life."}],"version":1}],"direction":"ltr","format":"","indent":0,"version":1}}'

update_global "homepage" "{\"heroHeading\":\"Fractional Design Partner for Early-Stage Teams\",\"heroSubheading\":\"I help early-stage startups ship fast without compromising quality.\",\"featuredProjects\":[\"$P1\",\"$P2\",\"$P3\",\"$P4\"],\"aboutHeading\":\"About\",\"aboutText\":$ABOUT,\"testimonials\":[\"$T1\",\"$T2\",\"$T3\",\"$T4\",\"$T5\",\"$T6\"],\"faq\":$FAQ,\"contactHeading\":\"Need a Design Partner?\",\"contactText\":\"I am currently focused on projects that involve building new hardware. If you are creating hardware that would benefit from a thoughtful, delightful software experience, feel free to reach out.\",\"contactEmail\":\"gabe@valdivia.works\"}" > /dev/null

echo "=== Seed complete! ==="

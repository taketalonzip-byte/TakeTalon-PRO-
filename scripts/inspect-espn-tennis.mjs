const tours = ["atp", "wta"];
for (const tour of tours) {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/scoreboard`);
  const data = await response.json();
  console.log(tour, { events: data.events?.length || 0, topKeys: Object.keys(data) });
  for (const event of (data.events || []).slice(0, 1)) {
    console.log({ eventKeys: Object.keys(event), id: event.id, name: event.name, children: event.children?.length || 0, competitions: event.competitions?.length || 0, links: event.links?.length || 0 });
    console.log(JSON.stringify(event, null, 2).slice(0, 2500));
  }
}

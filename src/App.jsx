import { useEffect, useMemo, useState } from "react";
import boardConfig from "./config/board.json";
import people from "./config/people.json";
import rooms from "./config/rooms.json";
import routines from "./config/routines.json";
import scheduleStates from "./config/schedule-states.json";

const { storageKey, defaultScheduleId, typeLabels } = boardConfig;

const initialPositions = Object.fromEntries(people.map((person) => [person.id, person.startRoom]));
const validRoomIds = new Set(rooms.map((room) => room.id));
const validPersonIds = new Set(people.map((person) => person.id));

function readSavedBoard() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const savedPositions = Object.fromEntries(
      Object.entries(saved?.positions || {})
        .map(([personId, roomId]) => [
          boardConfig.personAliases?.[personId] || personId,
          boardConfig.roomAliases?.[roomId] || roomId,
        ])
        .filter(([personId, roomId]) => validPersonIds.has(personId) && validRoomIds.has(roomId)),
    );
    const savedPinned = (saved?.pinned || [])
      .map((personId) => boardConfig.personAliases?.[personId] || personId)
      .filter((personId) => validPersonIds.has(personId));
    return {
      day: Math.max(1, Number.parseInt(saved?.day, 10) || 1),
      scheduleId: saved?.scheduleId || defaultScheduleId,
      positions: { ...initialPositions, ...savedPositions },
      pinned: [...new Set(savedPinned)],
    };
  } catch {
    return { day: 1, scheduleId: defaultScheduleId, positions: initialPositions, pinned: [] };
  }
}

function chooseWeightedRoom(options) {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [roomId, weight] of options) {
    roll -= weight;
    if (roll <= 0) return roomId;
  }
  return options.at(-1)[0];
}

function App() {
  const [savedBoard] = useState(readSavedBoard);
  const [day, setDay] = useState(savedBoard.day);
  const [currentSchedule, setCurrentSchedule] = useState(savedBoard.scheduleId);
  const [positions, setPositions] = useState(savedBoard.positions);
  const [pinnedIds, setPinnedIds] = useState(() => new Set(savedBoard.pinned));
  const [draggingId, setDraggingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        day,
        scheduleId: currentSchedule,
        positions,
        pinned: [...pinnedIds],
      }),
    );
  }, [day, currentSchedule, positions, pinnedIds]);

  const visiblePeople = useMemo(() => {
    return people
      .filter((person) => filter === "all" || person.type === filter)
      .sort((first, second) => {
        const pinDifference = Number(pinnedIds.has(second.id)) - Number(pinnedIds.has(first.id));
        return pinDifference || first.name.localeCompare(second.name);
      });
  }, [filter, pinnedIds]);

  const roomCounts = useMemo(() => {
    return people.reduce((counts, person) => {
      const room = positions[person.id];
      counts[room] = (counts[room] || 0) + 1;
      return counts;
    }, {});
  }, [positions]);

  function applySchedule(scheduleId) {
    if (scheduleId === defaultScheduleId && currentSchedule !== defaultScheduleId) {
      const startsNewDay = window.confirm(
        `Start prison day ${day + 1}?\n\nOK advances the day. Cancel keeps day ${day}, but Morning Count still rerolls unpinned people.`,
      );
      if (startsNewDay) setDay((current) => current + 1);
    }
    setCurrentSchedule(scheduleId);
    setSelectedId(null);
    setPositions((current) => {
      const next = { ...current };
      for (const person of people) {
        if (pinnedIds.has(person.id)) continue;
        next[person.id] = chooseWeightedRoom(routines[person.role][scheduleId]);
      }
      return next;
    });
  }

  function movePerson(personId, roomId) {
    if (!personId) return;
    setPositions((current) => ({ ...current, [personId]: roomId }));
    setDraggingId(null);
    setSelectedId(null);
  }

  function togglePinned(personId) {
    setPinnedIds((current) => {
      const next = new Set(current);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function resetBoard() {
    setDay(1);
    setCurrentSchedule(defaultScheduleId);
    setPositions(initialPositions);
    setPinnedIds(new Set());
    setSelectedId(null);
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">{boardConfig.eyebrow}</p>
          <h1>{boardConfig.title}</h1>
          <p className="subtitle">{boardConfig.subtitle}</p>
        </div>
        <div className="masthead-status" aria-live="polite">
          <label className="day-control">
            <span>Prison day</span>
            <input
              aria-label="Prison day"
              min="1"
              onChange={(event) => setDay(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
              type="number"
              value={day}
            />
          </label>
          <span>Current schedule</span>
          <strong>{scheduleStates.find((state) => state.id === currentSchedule)?.label}</strong>
          <small>{pinnedIds.size} pinned · {people.length} tracked</small>
        </div>
      </header>

      <section className="schedule-panel" aria-label="Prison schedule controls">
        <div className="schedule-heading">
          <div>
            <p className="panel-kicker">DAILY MOVEMENT</p>
            <h2>Advance the schedule</h2>
          </div>
          <p>Unpinned people follow their usual routines, with a little variation.</p>
        </div>
        <div className="schedule-track">
          {scheduleStates.map((state, index) => (
            <button
              className={currentSchedule === state.id ? "schedule-button active" : "schedule-button"}
              key={state.id}
              onClick={() => applySchedule(state.id)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {state.short}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar">
        <div className="legend" aria-label="Token legend">
          {Object.entries(typeLabels).map(([type, label]) => (
            <button
              className={filter === type ? `legend-key ${type} active` : `legend-key ${type}`}
              key={type}
              onClick={() => setFilter((current) => (current === type ? "all" : type))}
              type="button"
            >
              <span />
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <p>{selectedId ? "Select a room to move the highlighted person." : "Drag a token, or select one then choose a room."}</p>
          <button className="reset-button" onClick={resetBoard} type="button">Reset board</button>
        </div>
      </section>

      <main className="room-grid">
        {rooms.map((room) => {
          const occupants = visiblePeople.filter((person) => positions[person.id] === room.id);
          const isDropTarget = Boolean(draggingId || selectedId);
          return (
            <section
              className={`room-card zone-${room.zone} ${room.suite ? `suite-${room.suite}` : ""} ${isDropTarget ? "ready" : ""}`}
              data-suite={room.suite || undefined}
              key={room.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                movePerson(event.dataTransfer.getData("text/person-id") || draggingId, room.id);
              }}
            >
              <button
                className="room-heading"
                disabled={!selectedId}
                onClick={() => movePerson(selectedId, room.id)}
                type="button"
              >
                <div>
                  {room.suiteLabel && <span className="suite-label">{room.suiteLabel}</span>}
                  <p>{room.detail}</p>
                  <h3>{room.name}</h3>
                </div>
                <span className="room-count">{roomCounts[room.id] || 0}</span>
              </button>
              <div className="occupants">
                {occupants.length === 0 ? (
                  <p className="empty-room">{filter === "all" ? "No one currently here" : "No matching people"}</p>
                ) : occupants.map((person) => {
                  const pinned = pinnedIds.has(person.id);
                  const selected = selectedId === person.id;
                  return (
                    <article
                      className={`person-token ${person.type} ${selected ? "selected" : ""}`}
                      draggable
                      key={person.id}
                      onClick={() => setSelectedId((current) => current === person.id ? null : person.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/person-id", person.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(person.id);
                      }}
                      title={`${typeLabels[person.type]} — ${pinned ? "pinned to this room" : "moves with schedule"}`}
                    >
                      <span className="token-dot" />
                      <span className="person-name">{person.name}</span>
                      <button
                        aria-label={pinned ? `Unpin ${person.name}` : `Pin ${person.name} here`}
                        className={pinned ? "pin-button pinned" : "pin-button"}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePinned(person.id);
                        }}
                        type="button"
                      >
                        {pinned ? "◆" : "◇"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      <footer>
        <span>Local board state saves automatically in this browser.</span>
        <span>◇ follows schedule &nbsp; ◆ pinned in place</span>
      </footer>
    </div>
  );
}

export default App;

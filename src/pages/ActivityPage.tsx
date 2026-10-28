import type { ActivityEntry } from '../types/app-types';
import Icon from '../components/ui/Icon';
import { friendlyDate } from '../utils/formatters';

export default function ActivityPage({
  activities,
}: {
  activities: ActivityEntry[];
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">RECENT EVENTS</div>
          <h1>Activity</h1>
          <p>Recent actions from this session are listed here.</p>
        </div>
      </div>

      <section className="content-card activity-card">
        <div className="content-card-header">
          <div>
            <h2>Session history</h2>
            <p>
              This timeline is kept in memory and clears when the app restarts.
            </p>
          </div>
          <span className="activity-count">
            {activities.length} {activities.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {activities.length ? (
          <div className="activity-list">
            {activities.map((entry) => (
              <div className="activity-entry" key={entry.id}>
                <div
                  className={`activity-entry-icon activity-tone-${entry.tone}`}
                >
                  <Icon
                    name={
                      entry.tone === 'success'
                        ? 'circleCheck'
                        : entry.tone === 'warning'
                          ? 'warning'
                          : 'activity'
                    }
                    size={17}
                  />
                </div>

                <div className="activity-entry-main">
                  <strong>{entry.title}</strong>
                  <p>{entry.description}</p>
                  <span>{friendlyDate(entry.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="page-empty-state">
            <div className="empty-state-icon">
              <Icon name="clock" size={27} />
            </div>
            <h3>No activity yet</h3>
            <p>
              Choose a folder or preview files. Actions from this session will
              appear here.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

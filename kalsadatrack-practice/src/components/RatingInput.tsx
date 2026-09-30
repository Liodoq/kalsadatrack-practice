import { RATING_LABEL } from '../lib/format';

interface Props {
  value: number | null;
  onChange: (score: number) => void;
  disabled?: boolean;
}

export default function RatingInput({ value, onChange, disabled }: Props) {
  return (
    <div className="rating-input" role="radiogroup" aria-label="Inconvenience rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          className={`rating-btn${value !== null && i <= value ? ' on' : ''}${value === i ? ' current' : ''}`}
          onClick={() => onChange(i)}
          disabled={disabled}
          title={RATING_LABEL[i]}
        >
          <span className="rating-num">{i}</span>
          <span className="rating-lbl">{RATING_LABEL[i]}</span>
        </button>
      ))}
    </div>
  );
}

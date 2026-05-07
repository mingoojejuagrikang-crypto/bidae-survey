interface Props {
  message: string
}

export function WarningBadge({ message }: Props) {
  return (
    <span style={{
      background: '#fef08a',
      color: '#713f12',
      border: '1px solid #f59e0b',
      borderRadius: 4,
      padding: '2px 6px',
      fontSize: 13,
      fontWeight: 600,
    }}>
      ⚠ {message}
    </span>
  )
}

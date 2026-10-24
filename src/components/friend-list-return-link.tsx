import { Link, useLocation, useNavigate } from 'react-router'
import type { ComponentProps } from 'react'

// A visit launched from the list returns to that same history entry so its
// scroll and filters can be restored. Direct visit URLs still open the list.
export function FriendListReturnLink(props: Omit<ComponentProps<typeof Link>, 'to'>) {
  const location = useLocation()
  const navigate = useNavigate()
  return <Link {...props} to="/friends" onClick={event => {
    props.onClick?.(event)
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (!props.target || props.target === '_self') && typeof location.state?.friendListReturnKey === 'string') {
      event.preventDefault()
      void navigate(-1)
    }
  }}/>
}

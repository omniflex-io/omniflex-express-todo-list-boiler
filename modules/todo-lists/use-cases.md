# Todo Lists Use Cases

## Core Use Cases

### Family Supplies Management
1. **Create Home Supply List**
   - Parent creates "Home Supplies" list with location "Home"
   - System auto-invites creator
   - Parent invites family members

2. **Daily Supply Management**
   - Family member adds "Buy eggs" to list
   - Another member sees item, buys eggs
   - Member marks item as completed
   - System notifies other members about completion
   - Any member can reopen if quality issue found

3. **Supply Discussion**
   - Member adds "Buy new rice brand"
   - Others discuss in item thread about brand preferences
   - Final decision captured in thread
   - Member buys agreed brand
   - Marks item complete with note

### Event Planning
1. **Create Event List**
   - Organizer creates "Friends Reunion" list
   - System auto-invites creator
   - Invites all participants

2. **Task Distribution**
   - Members add various tasks:
     - Book restaurant
     - Order food
     - Arrange decorations
   - Members self-assign tasks
   - Update progress in discussions

3. **Collaborative Decision Making**
   - Member suggests venue in task
   - Group discusses pros/cons in thread
   - Final venue confirmed in thread
   - Task marked complete with details

## Access Control

### List Access
- Only invited members can view/edit list
- List owner can manage invitations
- System validates invitation status for all operations
- Rejected/removed members lose access immediately

### Item Access
- Only list members can view/edit items
- Item operations require valid list access
- System validates list membership for all item operations
- Discussion access follows item access rules

## Practical API Requirements

### List Management
- Create list with location
- Get user's lists (owned + invited)
- Archive completed lists
- No need for list deletion (audit trail)
- Validate user's list access for all operations

### Invitation System
- Invite members to list
- Accept/reject invitation
- Get pending invitations
- Remove member from list
- System auto-invite for list creator
- Access control based on invitation status

### Item Management
- Add items to list
- Mark item complete/incomplete
- Get items by list (with filters)
- Get item details with discussion
- No hard delete (audit trail)
- Validate list access for all item operations

### Discussion System
- Start/view item discussion
- Add message to discussion
- Get discussion messages
- No edit/delete (audit trail)
- Inherit access control from parent item 
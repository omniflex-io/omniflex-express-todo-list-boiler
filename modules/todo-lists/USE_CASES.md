# Todo Lists Use Cases

## List Management

### Create List
- Owner creates a new todo list
- System automatically adds owner as an accepted member
- List starts in non-archived state
- Only authenticated users can create lists

### View Lists
- User can view their own lists
- User can view lists they are invited to
- Lists are paginated for better performance
- List access requires valid membership or ownership

### Archive List
- Only owners can archive a list
- Archived lists are not shown in the main view
- Archived lists can be viewed by members
- Only owners can manage list settings
- Non-owners attempting to archive a list will receive a 404 response (not 403) to prevent information leakage about list existence

## Item Management

### Create Item
- Only list members can add items to a list
- Items start in non-completed state
- Items must have content
- Item creation requires valid list membership

### Update Item
- Only list members can update item content
- Original creation metadata is preserved
- Update timestamp is recorded
- Item updates require valid list membership

### Complete/Uncomplete Item
- Only list members can mark items as complete
- Only list members can unmark completed items
- System records who completed the item and when
- No automatic completion, users must explicitly mark items
- Item status changes require valid list membership

## Discussion Management

### Create Discussion
- Each item can have one discussion thread
- Discussion is created automatically when needed
- All list members can participate
- Discussion creation requires valid list membership

### View Messages
- Only list members can view messages in a discussion
- Messages are ordered chronologically
- System shows who posted each message
- Message access requires valid list membership

### Post Message
- Only list members can post messages
- Messages must have content
- System records who posted the message and when
- Message posting requires valid list membership

## Access Control

### Direct Invitations
- Owner can invite other users directly
- Direct invitations are pre-approved by default
- Users must explicitly accept or reject invitations
- Accepted invitations grant list access
- Rejected invitations are kept for audit purposes

### Invitation Codes
- Owner can generate invitation codes for their lists
- Invitation codes are valid for 24 hours
- Owner can choose between auto-approve or manual approval
- Users can join lists using invitation codes
- Manual approval requires list owner to approve the invitation
- Auto-approve invitations grant immediate access upon joining

### Invitation Management
- Users can view their pending invitations
- Users can view their accepted invitations
- List owners can view and manage all invitations to their lists
- List owners can approve or reject pending invitations
- List owners can view and manage their invitation codes
- Users can only view invitations where they are:
  - The list owner
  - The inviter
  - The invitee
- Non-owner list members cannot view other members' invitations
- Invitations require both user acceptance and owner approval

### Access Validation
- All operations require valid authentication
- List operations require active membership
- Item operations validate list access first
- Owner operations validate list ownership
- Invitation operations validate appropriate access rights:
  - List-wide invitation operations require ownership
  - Individual invitation operations require owner/inviter/invitee status
- Discussion and message operations validate list membership

## Best Practices

1. Always validate user access before operations
2. Maintain audit trail for important actions
3. Use pagination for list operations
4. Keep archived items separate from active ones
5. Preserve data integrity in all operations 
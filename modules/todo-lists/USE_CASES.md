# Todo Lists Use Cases

## List Management

### Create List
- Owner creates a new todo list
- System automatically adds owner as an accepted member
- List starts in non-archived state

### View Lists
- User can view their own lists
- User can view lists they are invited to
- Lists are paginated for better performance

### Archive List
- Owner can archive a list
- Archived lists are not shown in the main view
- Archived lists can be viewed separately

## Item Management

### Create Item
- Members can add items to a list
- Items start in non-completed state
- Items must have content

### Update Item
- Members can update item content
- Original creation metadata is preserved
- Update timestamp is recorded

### Complete/Uncomplete Item
- Members can mark items as complete
- Members can unmark completed items
- System records who completed the item and when
- No automatic completion, users must explicitly mark items

## Discussion Management

### Create Discussion
- Each item can have one discussion thread
- Discussion is created automatically when needed
- All list members can participate

### View Messages
- Members can view all messages in a discussion
- Messages are ordered chronologically
- System shows who posted each message

## Access Control

### Invitations
- Owner can invite other users
- Invitations start in 'pending' state
- Users must accept invitations to access lists

### Access Validation
- All operations require valid authentication
- List operations require active membership
- Item operations validate list access first

## Best Practices

1. Always validate user access before operations
2. Maintain audit trail for important actions
3. Use pagination for list operations
4. Keep archived items separate from active ones
5. Preserve data integrity in all operations 
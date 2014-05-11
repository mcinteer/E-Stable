using System;

namespace EStable.Models
{
    public class StableUser
    {
        public int UserId { get; set; }

        public int StableID { get; set; }

        public DateTime InviteExpires { get; set; }

        public int Active { get; set; }

        public StableUser(AccountModel model, int userID, int stableID)
        {
            UserId = userID;
            StableID = stableID;
            InviteExpires = DateTime.Now.AddDays(30);
            Active = 0;
        }
    }
}
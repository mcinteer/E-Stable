using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MySql.Data.MySqlClient;

namespace EStable.Models
{
    public class UserOfStablePortal
    {
        public string Email { get; set; }

        public string Password { get; set; }
        
        public string Active { get; set; }

        public string ForcePWChange { get; set; }

        public int LastAccessedStableId { get; set; }

        public int UserId { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }
    }
}
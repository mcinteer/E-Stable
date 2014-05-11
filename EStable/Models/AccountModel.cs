using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MySql.Data.MySqlClient;

namespace EStable.Models
{
    public class AccountModel
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }

        public string FullName
        {
            get { return string.Format("{0} {1}", FirstName, LastName); }
        }

        public string Email { get; set; }

        public string Password { get; set; }

        public int Active { get; set; }

        public int ForcePWChange { get; set; }
    }
}
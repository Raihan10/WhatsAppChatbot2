Imports SocketIOClient
Imports MessagingToolkit.QRCode
Imports System.Data.Odbc

Public Class Form1
    Dim url As String = "http://localhost:8000"
    Dim client As SocketIO
    Dim client2 As SocketIO

    'For Database Use
    Dim connection As OdbcConnection
    Dim da As OdbcDataAdapter
    Dim ds As DataSet
    Dim periDB As String
    Const msgPrefixLength As Integer = 4

    Private Sub Form1_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        'PictureBox3.Image = My.Resources.Loading
        'Control.CheckForIllegalCrossThreadCalls = False

        'client = New SocketIO(url, New SocketIOOptions)

        'InitSocketOn(client)
        'client.ConnectAsync()

        'connectToDB()
        Initialize()
    End Sub

    Private Sub ShowQR(qr As String)
        Dim qrCode As New Codec.QRCodeEncoder

        PictureBox3.Image = qrCode.Encode(qr)
    End Sub

    Private Sub ShowMsg(msg As String)
        TextBox1.Text += msg & vbCrLf & vbCr
        TextBox1.SelectionStart = TextBox1.Text.Length
        TextBox1.ScrollToCaret()
    End Sub
    Private Sub connectToDB()
        periDB = "Driver={MySQL ODBC 8.0 UNICODE Driver};Server=localhost;Port=3307;Database=peri;uid=root;Option=3;"
        connection = New OdbcConnection(periDB)
        If connection.State = ConnectionState.Closed Then connection.Open()
    End Sub
    Private Function GetDataFromDatabase(msgBody As String)
        Dim msgReplay As String
        'Test DB
        If msgBody.Length > msgPrefixLength And msgBody.StartsWith("ISBN") Then
            Dim isbnCode As String = msgBody.Substring(msgPrefixLength)
            'MessageBox.Show(isbnCode)
            da = New OdbcDataAdapter("SELECT peri_location.location, peri_location.nama, peri_location.nick, peri_location.cabang, peri_stock.stock
            FROM ((peri_stock
            INNER JOIN peri_location ON peri_location.location = peri_stock.location))
            WHERE peri_stock.isbn='" & isbnCode & "';", connection)
            ds = New DataSet
            ds.Clear()
            da.Fill(ds, "peri_stock")

            If ds.Tables("peri_stock").Rows.Count = 0 Then 'ISBN not found
                msgReplay = String.Format("*Mohon Maaf, ISBN tidak ditemukan*")
            Else
                ' MessageBox.Show(ds.Tables("peri_stock").Rows.Count)
                'MessageBox.Show(ds.Tables("peri_stock").Rows(0).Item(1).ToString())
                'MessageBox.Show(ds.Tables("peri_stock").Rows(0).Item(3).ToString())
                'MessageBox.Show(ds.Tables("peri_stock").Rows(0).Item(4).ToString())
                'MessageBox.Show(ds.Tables("peri_stock").Rows(0).Item(0).ToString())

                'Bikin message
                Dim listLocationInfo As New List(Of String)
                Dim i As Integer

                'Loop in dataset
                For i = 0 To ds.Tables("peri_stock").Rows.Count - 1
                    Dim locationString = String.Format("{1}*Location :* {0}{1}", ds.Tables("peri_stock").Rows(i).Item(0).ToString(), vbCrLf)
                    Dim namaString = String.Format("*Nama :* {0}{1}", ds.Tables("peri_stock").Rows(i).Item(1).ToString(), vbCrLf)
                    Dim nickString = String.Format("*Nick :* {0}{1}", ds.Tables("peri_stock").Rows(i).Item(2).ToString(), vbCrLf)
                    Dim cabangString = String.Format("*Cabang :* {0}{1}", ds.Tables("peri_stock").Rows(i).Item(3).ToString(), vbCrLf)
                    Dim stockString = String.Format("*Stock :* {0}{1}", ds.Tables("peri_stock").Rows(i).Item(4).ToString(), vbCrLf)

                    Dim locationInfoString = locationString & namaString & nickString & cabangString & stockString
                    listLocationInfo.Add(locationInfoString)
                Next

                Dim locationInfo As String = String.Join("", listLocationInfo)
                msgReplay = String.Format("*ISBN :* {0}{1}{1}{2}", msgBody, vbCrLf, locationInfo)
            End If
        Else
            msgReplay = String.Format("Halo Sobat,{0}{0}Silakan menggunakan format ISBN<NOMOR_ISBN> untuk menggunakan chatbot ini{0}{0}Contoh: ISBN20567",
            vbCrLf)
        End If

        Return msgReplay
    End Function

    Private Sub InitSocketOn(client As SocketIO)
        client.On("message", Sub(response)
                                 ShowMsg(response.GetValue.ToString)
                             End Sub)
        client.On("qr", Sub(response)
                            Call ShowQR(response.GetValue.ToString)
                        End Sub)
        client.On("ready", Sub(response)
                               PictureBox3.Image = My.Resources.rsz_peripluscom
                           End Sub)
        client.On("messageBody", Sub(response)
                                     'MessageBox.Show(response.ToString)
                                     'client.EmitAsync("replyMessage", response.GetValue(0).ToString,
                                     'response.GetValue(1).ToString)
                                     Dim replayMessage As String = GetDataFromDatabase(response.GetValue(1).ToString)
                                     client.EmitAsync("replyMessage", replayMessage)
                                 End Sub)
        client.On("loggedOut", Sub(response)
                                   client.DisconnectAsync()
                                   PictureBox3.Image = My.Resources.Loading
                                   client.ConnectAsync()
                                   'Initialize()
                               End Sub)
    End Sub
    Private Sub LogOut(client As SocketIO)
        client.EmitAsync("loggedOut", "Client was logged out")
    End Sub
    Private Sub Initialize()
        PictureBox3.Image = My.Resources.Loading
        Control.CheckForIllegalCrossThreadCalls = False

        client = New SocketIO(url, New SocketIOOptions)

        InitSocketOn(client)
        client.ConnectAsync()

        connectToDB()
    End Sub
End Class